/**
 * Operações de baixo nível sobre as tabelas de chamados.
 * Mantêm todas as tabelas ligadas ao chamado em sincronia
 * (CHAMADO, STATUS_CHAMADO, PRIORIDADE, HISTORICO_CHAMADO, ATENDIMENTO,
 * associativas e complementos). São usadas pelos serviços e pelos dados iniciais.
 */
import { PRIORIDADE_DESCRICAO, PRIORIDADE_LABEL, PRIORIDADE_NIVEL, STATUS_DESCRICAO, STATUS_LABEL } from '@/core/labels';
import type { Prioridade, StatusChamado, TipoEvento } from '@/core/types';
import { caber, LIMITE } from './limites';
import type { Complementos, Tabelas } from './tabelas';

const prox = <T>(lista: T[], campo: keyof T) => lista.reduce((m, x) => Math.max(m, Number(x[campo]) || 0), 0) + 1;

export const STATUS_POR_NOME = Object.fromEntries(
  Object.entries(STATUS_LABEL).map(([chave, nome]) => [nome, chave]),
) as Record<string, StatusChamado>;

export const PRIORIDADE_POR_NIVEL = Object.fromEntries(
  Object.entries(PRIORIDADE_NIVEL).map(([chave, nivel]) => [nivel, chave]),
) as Record<string, Prioridade>;

/** Status atual = linha mais recente de STATUS_CHAMADO do chamado. */
export function statusAtual(t: Tabelas, idChamado: number): StatusChamado {
  const linhas = t.STATUS_CHAMADO.filter((s) => s.FK_CHAMADO_id_chamado === idChamado);
  const ultima = linhas.reduce((a, b) => (b.id_status > a.id_status ? b : a), linhas[0]);
  return ultima ? STATUS_POR_NOME[ultima.nome] ?? 'aberto' : 'aberto';
}

export function prioridadeAtual(t: Tabelas, idChamado: number): Prioridade {
  const linhas = t.PRIORIDADE.filter((p) => p.FK_CHAMADO_id_chamado === idChamado);
  const ultima = linhas.reduce((a, b) => (b.id_prioridade > a.id_prioridade ? b : a), linhas[0]);
  return ultima ? PRIORIDADE_POR_NIVEL[ultima.nivel] ?? 'media' : 'media';
}

export function definirPrioridade(t: Tabelas, idChamado: number, p: Prioridade): void {
  t.PRIORIDADE.push({
    id_prioridade: prox(t.PRIORIDADE, 'id_prioridade'),
    nome: PRIORIDADE_LABEL[p],
    nivel: PRIORIDADE_NIVEL[p],
    descricao: PRIORIDADE_DESCRICAO[p],
    FK_CHAMADO_id_chamado: idChamado,
  });
}

export interface NovoChamadoTabelas {
  protocolo: string;
  titulo: string;
  descricao: string;
  idLocal: number;
  idEquipamento: number | null;
  idSolicitante: number;
  prioridade: Prioridade;
  data: string;
}

export function inserirChamado(t: Tabelas, c: Complementos, d: NovoChamadoTabelas): number {
  const id = prox(t.CHAMADO, 'id_chamado');
  t.CHAMADO.push({
    id_chamado: id,
    protocolo: d.protocolo,
    titulo: caber(d.titulo, LIMITE.titulo),
    descricao: caber(d.descricao, LIMITE.descricao_chamado),
    data_abertura: d.data,
    data_atualizacao: d.data,
    data_encerramento: null,
    FK_ATENDIMENTO_id_atendimento: null,
    FK_LOCAL_id_local: d.idLocal,
  });
  t.Usuario_chama_solicita.push({ fk_USUARIO_id_usuario: d.idSolicitante, fk_CHAMADO_id_chamado: id });
  definirPrioridade(t, id, d.prioridade);
  if (d.idEquipamento) {
    c.chamado_equipamento.push({ id_chamado: id, id_equipamento: d.idEquipamento });
    const eq = t.EQUIPAMENTO.find((e) => e.id_equipamento === d.idEquipamento);
    if (eq) eq.FK_CHAMADO_id_chamado = id; // último chamado do aparelho (FK do modelo)
  }
  registrarEvento(t, c, { idChamado: id, tipo: 'abertura', idAutor: d.idSolicitante, data: d.data, texto: d.descricao, status: 'aberto' });
  return id;
}

export interface DadosAtendimentoTabela {
  comentario: string;
  procedimentos: string;
  materiais: string;
  orientacoes: string;
  solucao: string;
}

export interface NovoEvento {
  idChamado: number;
  tipo: TipoEvento;
  idAutor: number;
  data: string;
  texto: string;
  /** Se informado, cria uma nova linha de STATUS_CHAMADO (o status muda). */
  status?: StatusChamado;
  /** Se informado, cria uma linha de ATENDIMENTO ligada ao evento. */
  atendimento?: DadosAtendimentoTabela;
}

/** Registra um evento no histórico e atualiza status/atendimento. Retorna id_historico. */
export function registrarEvento(t: Tabelas, c: Complementos, e: NovoEvento): number {
  const chamado = t.CHAMADO.find((x) => x.id_chamado === e.idChamado);
  if (!chamado) throw new Error('Chamado não encontrado.');

  const idHist = prox(t.HISTORICO_CHAMADO, 'id_historico');
  t.HISTORICO_CHAMADO.push({
    id_historico: idHist,
    tipo_evento: e.tipo,
    descricao: caber(e.texto, LIMITE.historico_descricao),
    data_hora: e.data,
  });
  t.hist_chamado_mantem.push({ id: prox(t.hist_chamado_mantem, 'id'), fk_HISTORICO_CHAMADO_id_historico: idHist, fk_CHAMADO_id_chamado: e.idChamado });
  c.historico_autor.push({ id_historico: idHist, id_usuario: e.idAutor });
  const autor = t.USUARIO.find((u) => u.id_usuario === e.idAutor);
  if (autor) autor.FK_HISTORICO_CHAMADO_id_historico = idHist;

  if (e.status) {
    const idStatus = prox(t.STATUS_CHAMADO, 'id_status');
    t.STATUS_CHAMADO.push({ id_status: idStatus, nome: STATUS_LABEL[e.status], descricao: STATUS_DESCRICAO[e.status], FK_CHAMADO_id_chamado: e.idChamado });
    t.Hist_Status_status.push({ Id: prox(t.Hist_Status_status, 'Id'), fk_HISTORICO_CHAMADO_id_historico: idHist, fk_STATUS_CHAMADO_id_status: idStatus });
    // Encerrado = resolvido ou fechado; reabrir limpa a data.
    chamado.data_encerramento = e.status === 'resolvido' || e.status === 'fechado' ? e.data : null;
  }

  if (e.atendimento) {
    const a = e.atendimento;
    const idAt = prox(t.ATENDIMENTO, 'id_atendimento');
    t.ATENDIMENTO.push({
      id_atendimento: idAt,
      data_hora: e.data,
      comentario: caber(a.comentario, LIMITE.comentario),
      procedimentos_realizados: caber(a.procedimentos, LIMITE.procedimentos_realizados),
      materiais_utilizados: caber(a.materiais, LIMITE.materiais_utilizados),
      orientacoes_fornecidas: caber(a.orientacoes, LIMITE.orientacoes_fornecidas),
      solucao_aplicada: caber(a.solucao, LIMITE.solucao_aplicada),
    });
    chamado.FK_ATENDIMENTO_id_atendimento = idAt; // atendimento atual do chamado
    if (autor) autor.FK_ATENDIMENTO_id_atendimento = idAt; // atendimento atual do técnico
    c.historico_atendimento.push({ id_historico: idHist, id_atendimento: idAt });
  }

  chamado.data_atualizacao = e.data;
  return idHist;
}

export function definirResponsavel(c: Complementos, idChamado: number, idUsuario: number): void {
  const atual = c.chamado_responsavel.find((r) => r.id_chamado === idChamado);
  if (atual) atual.id_usuario = idUsuario;
  else c.chamado_responsavel.push({ id_chamado: idChamado, id_usuario: idUsuario });
}

export interface NovaNotificacao {
  idUsuario: number;
  idChamado: number;
  idHistorico?: number;
  mensagem: string;
  tipo: string;
  data: string;
  lida?: boolean;
}

/** Cria a notificação e as três associações do modelo (recebe, gera, origina). */
export function inserirNotificacao(t: Tabelas, n: NovaNotificacao): number {
  const destinatario = t.USUARIO.find((u) => u.id_usuario === n.idUsuario);
  const id = prox(t.NOTIFICACAO, 'id_notificacao');
  t.NOTIFICACAO.push({
    id_notificacao: id,
    mensagem: caber(n.mensagem, LIMITE.mensagem),
    data_envio: n.data,
    data_leitura: n.lida ? n.data : null,
    // UC19 · FS001: destinatário sem contato válido → registra a falha, histórico continua.
    situacao_envio: destinatario && destinatario.situacao === 'ativo' ? 'enviada' : 'falhou',
    tipo: n.tipo,
  });
  t.Ususario_Not_recebe.push({ id: prox(t.Ususario_Not_recebe, 'id'), fk_USUARIO_id_usuario: n.idUsuario, fk_NOTIFICACAO_id_notificacao: id });
  t.Notifica_Chama_gera.push({ id: prox(t.Notifica_Chama_gera, 'id'), fk_NOTIFICACAO_id_notificacao: id, fk_CHAMADO_id_chamado: n.idChamado });
  if (n.idHistorico) {
    t.Hist_Notifica_origina.push({ Id: prox(t.Hist_Notifica_origina, 'Id'), fk_HISTORICO_CHAMADO_id_historico: n.idHistorico, fk_NOTIFICACAO_id_notificacao: id });
  }
  return id;
}
