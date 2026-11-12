/**
 * RF02–RF06, RF08, RF16–RF18 · Chamados.
 * Lê e grava nas tabelas CHAMADO, STATUS_CHAMADO, PRIORIDADE, HISTORICO_CHAMADO,
 * ATENDIMENTO e associativas, sempre por meio de data/operacoes.ts.
 */
import { STATUS_LABEL, TRANSICOES_TI } from '@/core/labels';
import type { Atendimento, Chamado, EventoChamado, Prioridade, StatusChamado, TipoEvento, Usuario } from '@/core/types';
import { complementos, tabelas, transacao } from '@/data/db';
import { LIMITE } from '@/data/limites';
import { definirResponsavel, inserirChamado, prioridadeAtual, registrarEvento, statusAtual, STATUS_POR_NOME } from '@/data/operacoes';
import type { CHAMADO } from '@/data/tabelas';
import { usuarioLogado } from './auth.service';
import { obterEquipamento } from './equipamentos.service';
import { obterLocal } from './locais.service';
import { notificar, notificarEquipeTI } from './notificacoes.service';

/* ---------- Leitura: monta a visão Chamado a partir das tabelas ---------- */

function eventosDo(idChamado: number): EventoChamado[] {
  const t = tabelas();
  const c = complementos();
  const ids = new Set(t.hist_chamado_mantem.filter((h) => h.fk_CHAMADO_id_chamado === idChamado).map((h) => h.fk_HISTORICO_CHAMADO_id_historico));
  return t.HISTORICO_CHAMADO.filter((h) => ids.has(h.id_historico))
    .sort((a, b) => a.data_hora.localeCompare(b.data_hora) || a.id_historico - b.id_historico)
    .map((h) => {
      const hs = t.Hist_Status_status.find((x) => x.fk_HISTORICO_CHAMADO_id_historico === h.id_historico);
      const st = hs && t.STATUS_CHAMADO.find((s) => s.id_status === hs.fk_STATUS_CHAMADO_id_status);
      const ha = c.historico_atendimento.find((x) => x.id_historico === h.id_historico);
      const at = ha && t.ATENDIMENTO.find((a) => a.id_atendimento === ha.id_atendimento);
      const atendimento: Atendimento | undefined = at && {
        id: at.id_atendimento,
        data: at.data_hora,
        comentario: at.comentario,
        procedimentos: at.procedimentos_realizados,
        materiais: at.materiais_utilizados,
        orientacoes: at.orientacoes_fornecidas,
        solucao: at.solucao_aplicada,
      };
      return {
        id: h.id_historico,
        tipo: h.tipo_evento as TipoEvento,
        autorId: c.historico_autor.find((a) => a.id_historico === h.id_historico)?.id_usuario ?? null,
        data: h.data_hora,
        texto: h.descricao,
        status: st ? STATUS_POR_NOME[st.nome] : undefined,
        atendimento,
      };
    });
}

function paraChamado(linha: CHAMADO): Chamado {
  const t = tabelas();
  const c = complementos();
  const id = linha.id_chamado;
  return {
    id,
    protocolo: linha.protocolo,
    titulo: linha.titulo,
    descricao: linha.descricao,
    prioridade: prioridadeAtual(t, id),
    status: statusAtual(t, id),
    localId: linha.FK_LOCAL_id_local,
    equipamentoId: c.chamado_equipamento.find((x) => x.id_chamado === id)?.id_equipamento ?? null,
    solicitanteId: t.Usuario_chama_solicita.find((s) => s.fk_CHAMADO_id_chamado === id)?.fk_USUARIO_id_usuario ?? 0,
    responsavelId: c.chamado_responsavel.find((r) => r.id_chamado === id)?.id_usuario ?? null,
    criadoEm: linha.data_abertura,
    atualizadoEm: linha.data_atualizacao,
    encerradoEm: linha.data_encerramento,
    eventos: eventosDo(id),
  };
}

export function listarChamados(): Chamado[] {
  return tabelas()
    .CHAMADO.map(paraChamado)
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
}

export function chamadosDoSolicitante(idUsuario: number): Chamado[] {
  const meus = new Set(tabelas().Usuario_chama_solicita.filter((s) => s.fk_USUARIO_id_usuario === idUsuario).map((s) => s.fk_CHAMADO_id_chamado));
  return listarChamados().filter((c) => meus.has(c.id));
}

export function obterChamado(protocolo: string): Chamado | undefined {
  const linha = tabelas().CHAMADO.find((c) => c.protocolo === protocolo);
  return linha && paraChamado(linha);
}

export const encerrado = (c: Chamado): boolean => c.status === 'resolvido' || c.status === 'fechado';

/** Último atendimento com solução registrada. */
export function ultimaSolucao(c: Chamado): Atendimento | undefined {
  return [...c.eventos].reverse().find((e) => e.atendimento && (e.atendimento.solucao || e.status === 'resolvido'))?.atendimento;
}

/** RF03 · "Já aconteceu por aqui?": chamados encerrados do mesmo local (e aparelho, se houver). */
export function chamadosParecidos(idLocal: number | null, idEquipamento: number | null, ignorar?: number): Chamado[] {
  if (!idLocal) return [];
  return listarChamados()
    .filter((c) => c.id !== ignorar && encerrado(c) && c.localId === idLocal)
    .filter((c) => !idEquipamento || c.equipamentoId === idEquipamento)
    .slice(0, 3);
}

/* ---------- Escrita ---------- */

function exigirUsuario(): Usuario {
  const u = usuarioLogado();
  if (!u) throw new Error('Sua sessão terminou. Entre de novo.');
  return u;
}

const agora = () => new Date().toISOString();

function linhaDo(protocolo: string): CHAMADO {
  const linha = tabelas().CHAMADO.find((c) => c.protocolo === protocolo);
  if (!linha) throw new Error('Chamado não encontrado.');
  return linha;
}

function proximoProtocolo(): string {
  const maior = tabelas().CHAMADO.reduce((m, c) => Math.max(m, Number(c.protocolo.replace(/\D/g, '')) || 0), 0);
  return `T-${String(maior + 1).padStart(4, '0')}`;
}

export interface DadosNovoChamado {
  titulo: string;
  descricao: string;
  prioridade: Prioridade | '';
  localId: string;
  equipamentoId: string;
}

/** RF02 · UC02 FS001/FS002. */
export function validarNovoChamado(d: DadosNovoChamado): Record<string, string> {
  const erros: Record<string, string> = {};
  if (d.titulo.length < 5) erros.titulo = 'Resuma o problema em poucas palavras (mínimo 5 letras).';
  else if (d.titulo.length > LIMITE.titulo) erros.titulo = `Use até ${LIMITE.titulo} caracteres.`;
  if (!d.prioridade) erros.prioridade = 'Escolha a prioridade.';
  const local = obterLocal(Number(d.localId));
  if (!local || !local.ativo) erros.localId = 'Escolha um local válido da lista.';
  if (d.equipamentoId) {
    const eq = obterEquipamento(Number(d.equipamentoId));
    if (!eq || eq.situacao === 'inativo' || eq.localId !== Number(d.localId)) erros.equipamentoId = 'Escolha um aparelho deste local.';
  }
  if (d.descricao.length < 10) erros.descricao = 'Conte o que aconteceu (mínimo 10 letras).';
  else if (d.descricao.length > LIMITE.descricao_chamado) erros.descricao = `Use até ${LIMITE.descricao_chamado} caracteres.`;
  return erros;
}

export function abrirChamado(d: DadosNovoChamado): Chamado {
  const autor = exigirUsuario();
  const protocolo = transacao(() => {
    const t = tabelas();
    const p = proximoProtocolo();
    const id = inserirChamado(t, complementos(), {
      protocolo: p,
      titulo: d.titulo,
      descricao: d.descricao,
      idLocal: Number(d.localId),
      idEquipamento: d.equipamentoId ? Number(d.equipamentoId) : null,
      idSolicitante: autor.id,
      prioridade: d.prioridade as Prioridade,
      data: agora(),
    });
    const hist = t.hist_chamado_mantem.filter((h) => h.fk_CHAMADO_id_chamado === id).pop()?.fk_HISTORICO_CHAMADO_id_historico;
    notificarEquipeTI(id, `${p} · Novo chamado de ${autor.nome}.`, 'novo', hist);
    return p;
  });
  return obterChamado(protocolo)!;
}

/** Solicitante (ou TI) adiciona uma mensagem. */
export function comentar(protocolo: string, texto: string): void {
  const autor = exigirUsuario();
  transacao(() => {
    const linha = linhaDo(protocolo);
    const c = paraChamado(linha);
    const hist = registrarEvento(tabelas(), complementos(), { idChamado: linha.id_chamado, tipo: 'comentario', idAutor: autor.id, data: agora(), texto });
    const msg = `${protocolo} · ${autor.nome} comentou: "${texto}"`;
    if (autor.id === c.solicitanteId) {
      if (c.responsavelId) notificar(c.responsavelId, linha.id_chamado, msg, 'comentario', hist);
      else notificarEquipeTI(linha.id_chamado, msg, 'comentario', hist);
    } else {
      notificar(c.solicitanteId, linha.id_chamado, msg, 'comentario', hist);
    }
  });
}

/** TI assume o chamado (aberto → em andamento). */
export function assumir(protocolo: string): void {
  const autor = exigirUsuario();
  transacao(() => {
    const linha = linhaDo(protocolo);
    const c = paraChamado(linha);
    definirResponsavel(complementos(), linha.id_chamado, autor.id);
    const hist = registrarEvento(tabelas(), complementos(), {
      idChamado: linha.id_chamado,
      tipo: 'atribuicao',
      idAutor: autor.id,
      data: agora(),
      texto: `Atribuído a ${autor.nome}.`,
      status: c.status === 'aberto' ? 'em_andamento' : undefined,
    });
    notificar(c.solicitanteId, linha.id_chamado, `${protocolo} · ${autor.nome} assumiu seu chamado.`, 'atribuicao', hist);
  });
}

export interface DadosAtendimento {
  status: StatusChamado;
  comentario: string;
  procedimentos: string;
  materiais: string;
  orientacoes: string;
  solucao: string;
}

/** RF06 + RF17 · UC06 FS001/FS002 e UC17 FS001/FS002. */
export function validarAtendimento(c: Chamado, d: DadosAtendimento): Record<string, string> {
  const erros: Record<string, string> = {};
  if (c.status === 'fechado') {
    erros.status = 'Chamado fechado não recebe atendimento. Reabra o chamado primeiro.';
    return erros;
  }
  if (d.status !== c.status && !TRANSICOES_TI[c.status].includes(d.status)) {
    erros.status = `De "${STATUS_LABEL[c.status]}" só é possível ir para: ${TRANSICOES_TI[c.status].map((s) => STATUS_LABEL[s]).join(', ')}.`;
  }
  const algum = d.comentario || d.procedimentos || d.materiais || d.orientacoes || d.solucao;
  if (d.status === c.status && !algum) erros.comentario = 'Mude o status ou registre alguma informação do atendimento.';
  if (d.status === 'resolvido' && c.status !== 'resolvido' && !d.solucao) erros.solucao = 'Informe a solução aplicada para marcar como resolvido.';
  const limites: [keyof DadosAtendimento, number][] = [
    ['comentario', LIMITE.comentario],
    ['procedimentos', LIMITE.procedimentos_realizados],
    ['materiais', LIMITE.materiais_utilizados],
    ['orientacoes', LIMITE.orientacoes_fornecidas],
    ['solucao', LIMITE.solucao_aplicada],
  ];
  limites.forEach(([campo, max]) => {
    if (String(d[campo]).length > max) erros[campo] = `Use até ${max} caracteres.`;
  });
  return erros;
}

export function registrarAtendimento(protocolo: string, d: DadosAtendimento): void {
  const autor = exigirUsuario();
  transacao(() => {
    const linha = linhaDo(protocolo);
    const c = paraChamado(linha);
    if (!c.responsavelId) definirResponsavel(complementos(), linha.id_chamado, autor.id);
    const mudou = d.status !== c.status;
    const texto = d.solucao ? `Solução: ${d.solucao}` : d.comentario || `Status alterado para ${STATUS_LABEL[d.status]}.`;
    const hist = registrarEvento(tabelas(), complementos(), {
      idChamado: linha.id_chamado,
      tipo: mudou ? 'status' : 'atendimento',
      idAutor: autor.id,
      data: agora(),
      texto,
      status: mudou ? d.status : undefined,
      atendimento: { comentario: d.comentario, procedimentos: d.procedimentos, materiais: d.materiais, orientacoes: d.orientacoes, solucao: d.solucao },
    });
    const msg =
      d.status === 'resolvido' && mudou
        ? `${protocolo} · Solução registrada. Confirme se resolveu.`
        : mudou
          ? `${protocolo} · Status mudou para ${STATUS_LABEL[d.status]}.`
          : `${protocolo} · Novo registro de atendimento.`;
    notificar(c.solicitanteId, linha.id_chamado, msg, mudou ? 'status' : 'atendimento', hist);
  });
}

/** Solicitante confirma a solução → Fechado. */
export function confirmarSolucao(protocolo: string): void {
  const autor = exigirUsuario();
  transacao(() => {
    const linha = linhaDo(protocolo);
    const c = paraChamado(linha);
    if (c.status !== 'resolvido') throw new Error('Só é possível confirmar um chamado resolvido.');
    const hist = registrarEvento(tabelas(), complementos(), {
      idChamado: linha.id_chamado, tipo: 'confirmacao', idAutor: autor.id, data: agora(),
      texto: 'Solicitante confirmou que o problema foi resolvido.', status: 'fechado',
    });
    notificar(c.responsavelId, linha.id_chamado, `${protocolo} · ${autor.nome} confirmou a solução. Chamado fechado.`, 'encerramento', hist);
  });
}

/**
 * Mudança de status feita arrastando o cartão no quadro da fila.
 * Como no Trello, o cartão pode ir para qualquer coluna (inclusive voltar),
 * sem seguir TRANSICOES_TI. Tudo fica no histórico e o solicitante é avisado.
 * Única exigência: para Resolvido é preciso informar a solução.
 * Retorna uma mensagem de erro, ou null se deu certo.
 */
export function moverChamado(protocolo: string, destino: StatusChamado, solucao = ''): string | null {
  const c = obterChamado(protocolo);
  if (!c) return 'Chamado não encontrado.';
  if (c.status === destino) return null;
  if (destino === 'resolvido' && !solucao) return 'Informe a solução aplicada para marcar como resolvido.';
  if (solucao.length > LIMITE.solucao_aplicada) return `Use até ${LIMITE.solucao_aplicada} caracteres.`;

  // Resolvido e Em andamento: mesmo caminho do formulário de atendimento
  // (quem ainda não tem responsável passa a ser o responsável).
  if (destino === 'resolvido' || destino === 'em_andamento') {
    registrarAtendimento(protocolo, { status: destino, comentario: '', procedimentos: '', materiais: '', orientacoes: '', solucao });
    return null;
  }

  // Aberto (voltar para a fila) e Fechado: só registram a mudança.
  const autor = exigirUsuario();
  transacao(() => {
    const linha = linhaDo(protocolo);
    const reabrindo = destino === 'aberto' && encerrado(c);
    const texto =
      destino === 'fechado'
        ? `Chamado fechado por ${autor.nome}.`
        : reabrindo
          ? `Chamado reaberto por ${autor.nome}.`
          : `Chamado devolvido para Aberto por ${autor.nome}.`;
    const hist = registrarEvento(tabelas(), complementos(), {
      idChamado: linha.id_chamado,
      tipo: reabrindo ? 'reabertura' : 'status',
      idAutor: autor.id,
      data: agora(),
      texto,
      status: destino,
    });
    if (c.solicitanteId !== autor.id) {
      notificar(c.solicitanteId, linha.id_chamado, `${protocolo} · Status mudou para ${STATUS_LABEL[destino]}.`, destino === 'fechado' ? 'encerramento' : 'status', hist);
    }
  });
  return null;
}

/** RF18 · UC18 FS001/FS002: só encerrados, com motivo; volta para a fila. */
export function reabrir(protocolo: string, motivo: string): string | null {
  const autor = exigirUsuario();
  const c = obterChamado(protocolo);
  if (!c) return 'Chamado não encontrado.';
  if (!encerrado(c)) return 'A reabertura só vale para chamados resolvidos ou fechados.';
  if (motivo.length < 10) return 'Explique o motivo da reabertura (mínimo 10 letras).';
  if (motivo.length > LIMITE.historico_descricao) return `O motivo pode ter até ${LIMITE.historico_descricao} caracteres.`;
  transacao(() => {
    const hist = registrarEvento(tabelas(), complementos(), {
      idChamado: c.id, tipo: 'reabertura', idAutor: autor.id, data: agora(), texto: motivo, status: 'aberto',
    });
    const msg = `${protocolo} · Reaberto por ${autor.nome}: "${motivo}"`;
    if (c.responsavelId && c.responsavelId !== autor.id) notificar(c.responsavelId, c.id, msg, 'reabertura', hist);
    else if (!c.responsavelId) notificarEquipeTI(c.id, msg, 'reabertura', hist, autor.id);
    if (c.solicitanteId !== autor.id) notificar(c.solicitanteId, c.id, msg, 'reabertura', hist);
  });
  return null;
}

/* ---------- Indicadores (RF16) ---------- */

export interface Indicadores {
  abertos: number;
  semResponsavel: number;
  emAndamento: number;
  parados: number;
  resolvidosPeriodo: number;
  resolvidosAnterior: number;
  tempoMedioHoras: number;
  porStatus: Record<StatusChamado, number>;
  porLocal: { nome: string; total: number }[];
  porTipo: { nome: string; total: number }[];
  recorrentes: { equipamentoId: number; total: number }[];
}

export function calcularIndicadores(dias: number): Indicadores {
  const fim = Date.now();
  const inicio = fim - dias * 864e5;
  const inicioAnterior = inicio - dias * 864e5;
  const todos = listarChamados();
  const doPeriodo = todos.filter((c) => new Date(c.criadoEm).getTime() >= inicio);

  const resolvidoEm = (c: Chamado) => {
    const ev = c.eventos.find((e) => e.status === 'resolvido');
    return ev ? new Date(ev.data).getTime() : null;
  };
  const resolvidosEntre = (de: number, ate: number) => todos.filter((c) => {
    const r = resolvidoEm(c);
    return r !== null && r >= de && r < ate;
  });
  const resolvidos = resolvidosEntre(inicio, fim + 1);
  const tempos = resolvidos.map((c) => (resolvidoEm(c)! - new Date(c.criadoEm).getTime()) / 36e5);

  const contar = (lista: Chamado[], chave: (c: Chamado) => string | number | null) => {
    const m = new Map<string | number, number>();
    lista.forEach((c) => {
      const k = chave(c);
      if (k !== null) m.set(k, (m.get(k) ?? 0) + 1);
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const porStatus = { aberto: 0, em_andamento: 0, resolvido: 0, fechado: 0 } as Record<StatusChamado, number>;
  doPeriodo.forEach((c) => (porStatus[c.status] += 1));

  return {
    abertos: todos.filter((c) => c.status === 'aberto').length,
    semResponsavel: todos.filter((c) => c.status === 'aberto' && !c.responsavelId).length,
    emAndamento: todos.filter((c) => c.status === 'em_andamento').length,
    parados: todos.filter((c) => c.status === 'em_andamento' && fim - new Date(c.atualizadoEm).getTime() > 3 * 864e5).length,
    resolvidosPeriodo: resolvidos.length,
    resolvidosAnterior: resolvidosEntre(inicioAnterior, inicio).length,
    tempoMedioHoras: tempos.length ? tempos.reduce((a, b) => a + b, 0) / tempos.length : 0,
    porStatus,
    porLocal: contar(doPeriodo, (c) => obterLocal(c.localId)?.nome ?? null).slice(0, 4).map(([nome, total]) => ({ nome: String(nome), total })),
    porTipo: contar(doPeriodo, (c) => obterEquipamento(c.equipamentoId)?.tipo ?? 'Sem aparelho').map(([nome, total]) => ({ nome: String(nome), total })),
    recorrentes: contar(doPeriodo, (c) => c.equipamentoId)
      .filter(([, total]) => total >= 2)
      .slice(0, 3)
      .map(([id, total]) => ({ equipamentoId: Number(id), total })),
  };
}
