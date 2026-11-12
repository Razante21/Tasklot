/**
 * Telas 05, 06 e 40 · Detalhe do chamado.
 * Solicitante (RF04 / UC04): acompanha, comenta, confirma, reabre e reutiliza.
 * Equipe de TI (RF05, RF06, RF17 / UC05, UC06, UC17): vê tudo, assume,
 * registra atendimento e muda o status.
 */
import { html, lerFormulario, mostrarErros, type Seguro } from '@/core/dom';
import { STATUS_LABEL, STATUS_ORDEM, TRANSICOES_TI, PRIORIDADE_LABEL } from '@/core/labels';
import { diaMesAsHora, diaMesHora } from '@/core/format';
import type { Chamado, EventoChamado, StatusChamado, Usuario } from '@/core/types';
import { LIMITE } from '@/data/limites';
import type { Contexto, Pagina } from '@/app/router';
import { navegar } from '@/app/router';
import { campoArea, campoSelect, campoTexto, ligarContadores } from '@/components/campos';
import { icone } from '@/components/icones';
import { seloStatus, vazio } from '@/components/selos';
import { abrirModal, avisar } from '@/components/feedback';
import {
  assumir,
  comentar,
  confirmarSolucao,
  obterChamado,
  reabrir,
  registrarAtendimento,
  validarAtendimento,
  type DadosAtendimento,
} from '@/services/chamados.service';
import { descreverEquipamento, obterEquipamento } from '@/services/equipamentos.service';
import { obterLocal } from '@/services/locais.service';
import { pode } from '@/services/permissoes.service';
import { nomeUsuario, obterUsuario } from '@/services/usuarios.service';

const TITULO_EVENTO: Record<EventoChamado['tipo'], (e: EventoChamado) => string> = {
  abertura: () => 'Chamado aberto',
  atribuicao: () => 'Responsável definido',
  status: (e) => `Status: ${STATUS_LABEL[e.status!]}`,
  atendimento: () => 'Registro de atendimento',
  comentario: () => 'Mensagem',
  reabertura: () => 'Chamado reaberto',
  confirmacao: () => 'Solução confirmada',
};

function linhaDoTempo(c: Chamado): Seguro {
  return html`
    <ol class="linha-tempo">
      ${c.eventos.map((e) => {
        const a = e.atendimento;
        const extras: [string, string][] = a
          ? ([
              ['Comentário', a.comentario],
              ['Procedimentos', a.procedimentos],
              ['Materiais', a.materiais],
              ['Orientações', a.orientacoes],
              ['Solução', a.solucao],
            ] as [string, string][]).filter(([, v]) => v && !e.texto.includes(v))
          : [];
        return html`
          <li class="${e.tipo}">
            <strong>${TITULO_EVENTO[e.tipo](e)}${e.status && e.tipo !== 'status' && e.tipo !== 'abertura' ? ` · ${STATUS_LABEL[e.status]}` : ''}</strong>
            <time datetime="${e.data}">${diaMesHora(e.data)} · ${nomeUsuario(e.autorId)}</time>
            <p>${e.tipo === 'reabertura' ? `Motivo: ${e.texto}` : e.texto}</p>
            ${extras.length ? html`<dl class="extra">${extras.map(([k, v]) => html`<div><dt>${k}:</dt> <dd>${v}</dd></div>`)}</dl>` : ''}
          </li>`;
      })}
    </ol>`;
}

function etapas(status: StatusChamado): Seguro {
  const atual = STATUS_ORDEM.indexOf(status);
  return html`
    <section class="card card--sem-padding" aria-label="Etapa atual: ${STATUS_LABEL[status]}">
      <div class="etapas">${STATUS_ORDEM.map((s, i) => html`<span class="etapa ${i <= atual ? 'feita' : ''}">${STATUS_LABEL[s]}</span>`)}</div>
    </section>`;
}

/** UC05 · FS001: dados ausentes ficam destacados para a TI. */
function cartaoDetalhes(c: Chamado, paraTI: boolean): Seguro {
  const solicitante = obterUsuario(c.solicitanteId);
  const eq = obterEquipamento(c.equipamentoId);
  const local = obterLocal(c.localId);
  const falta = (texto: string) => html`<span class="incompleto">${texto}</span>`;
  const linhas: [string, Seguro | string][] = [
    ...(paraTI && solicitante
      ? ([
          ['Solicitante', solicitante.nome],
          ['Perfil', solicitante.perfilNome],
          ['Contato', solicitante.contato ? `${solicitante.formaContato} ${solicitante.contato}` : falta('Sem contato')],
        ] as [string, Seguro | string][])
      : []),
    ['Local', local ? `${local.nome} · Bloco ${local.bloco}` : falta('Não informado')],
    ['Aparelho', eq ? `${descreverEquipamento(eq)} · ${eq.patrimonio}` : paraTI ? falta('Não informado') : 'Nenhum'],
    ['Prioridade', PRIORIDADE_LABEL[c.prioridade]],
    ['Aberto em', diaMesAsHora(c.criadoEm)],
    ['Responsável', c.responsavelId ? nomeUsuario(c.responsavelId) : paraTI ? falta('Sem responsável') : 'Equipe de TI'],
  ];
  return html`
    <section class="card">
      <h2>Detalhes</h2>
      <dl class="detalhes">${linhas.map(([k, v]) => html`<div><dt>${k}</dt><dd>${v}</dd></div>`)}</dl>
    </section>`;
}

/* ---------- Painéis de ação ---------- */

function botaoReutilizar(c: Chamado): Seguro {
  return pode('abrir_chamado')
    ? html`<a class="btn btn--contorno btn--pequeno" href="#/chamados/novo?de=${c.protocolo}">Reutilizar em novo chamado</a>`
    : html``;
}

function painelSolicitante(c: Chamado): Seguro {
  if (c.status === 'resolvido') {
    return html`
      <section class="faixa">
        <div><strong>A equipe de TI marcou como resolvido.</strong><span>O problema acabou?</span></div>
        <div class="btns">
          <button type="button" class="btn btn--escuro btn--pequeno" data-confirmar>Sim, confirmar</button>
          ${pode('reabrir_chamado') ? html`<button type="button" class="btn btn--contorno btn--pequeno" data-reabrir>Ainda com problema</button>` : ''}
        </div>
      </section>`;
  }
  if (c.status === 'fechado') {
    return html`
      <section class="card">
        <h2>O problema voltou?</h2>
        <p class="card__sub">Reabra contando o que aconteceu (volta para a fila com o histórico) ou use os dados num chamado novo.</p>
        <div class="cabecalho__acoes">
          ${pode('reabrir_chamado') ? html`<button type="button" class="btn btn--contorno btn--pequeno" data-reabrir>Reabrir chamado</button>` : ''}
          ${botaoReutilizar(c)}
        </div>
      </section>`;
  }
  return html`
    <form class="card form" data-form-comentario novalidate>
      <h2 style="margin-bottom:0">Adicionar informação</h2>
      ${campoArea({ nome: 'mensagem', rotulo: 'Mensagem para o suporte', limite: LIMITE.historico_descricao, placeholder: 'Ex.: o problema voltou a acontecer', altura: 80 })}
      <button class="btn btn--contorno" type="submit">Enviar mensagem</button>
    </form>`;
}

function painelTI(c: Chamado, usuario: Usuario): Seguro {
  // UC17 · FS002: chamado fechado não recebe registro; precisa reabrir.
  if (c.status === 'fechado') {
    return html`
      <section class="card">
        <h2>Chamado fechado</h2>
        <p class="card__sub">O solicitante confirmou a solução. Para registrar algo novo, reabra o chamado.</p>
        ${pode('reabrir_chamado') ? html`<button type="button" class="btn btn--contorno" data-reabrir style="width:100%">Reabrir chamado</button>` : ''}
      </section>`;
  }
  const opcoes = [c.status, ...TRANSICOES_TI[c.status]];
  const sugerido = c.status === 'aberto' ? 'em_andamento' : c.status;
  return html`
    ${c.responsavelId !== usuario.id
      ? html`
          <section class="card">
            <h2>${c.responsavelId ? `Com ${nomeUsuario(c.responsavelId)}` : 'Sem responsável'}</h2>
            <p class="card__sub">${c.responsavelId ? 'Assuma se você vai continuar o atendimento.' : 'Assuma para o solicitante saber que alguém está cuidando.'}</p>
            <button type="button" class="btn btn--escuro" data-assumir style="width:100%">Assumir chamado</button>
          </section>`
      : ''}
    <form class="card form" data-form-atendimento novalidate>
      <h2 style="margin-bottom:0">Registrar atendimento</h2>
      ${campoSelect({
        nome: 'status', rotulo: 'Status', valor: sugerido,
        opcoes: opcoes.map((s) => [s, s === c.status ? `${STATUS_LABEL[s]} (manter)` : STATUS_LABEL[s]]),
        ajuda: `Transições permitidas: ${STATUS_LABEL[c.status]} → ${TRANSICOES_TI[c.status].map((s) => STATUS_LABEL[s]).join(' ou ')}.`,
      })}
      ${campoTexto({ nome: 'comentario', rotulo: 'Comentário', limite: LIMITE.comentario, placeholder: 'Ex.: suspeita de fonte' })}
      ${campoTexto({ nome: 'procedimentos', rotulo: 'Procedimentos realizados', limite: LIMITE.procedimentos_realizados, placeholder: 'Ex.: troca do cabo HDMI' })}
      ${campoTexto({ nome: 'materiais', rotulo: 'Materiais utilizados', limite: LIMITE.materiais_utilizados, placeholder: 'Ex.: 1 cabo HDMI 3 m' })}
      ${campoTexto({ nome: 'orientacoes', rotulo: 'Orientações ao solicitante', limite: LIMITE.orientacoes_fornecidas, placeholder: 'Ex.: desligar o projetor pelo controle' })}
      ${campoTexto({ nome: 'solucao', rotulo: 'Solução aplicada', limite: LIMITE.solucao_aplicada, placeholder: 'Obrigatória para marcar como resolvido' })}
      <button class="btn btn--escuro" type="submit">Salvar atendimento</button>
      <small class="mudo">O solicitante recebe um aviso com a mudança.</small>
    </form>`;
}

/* ---------- Página ---------- */

export function paginaDetalheChamado({ params, usuario }: Contexto): Pagina {
  const c = obterChamado(params.id);
  const eSolicitante = c?.solicitanteId === usuario.id;
  const eTI = pode('registrar_atendimento');
  const podeVer = c && (eSolicitante || eTI || pode('ver_indicadores'));

  // UC04 · FS001 (não localizado) e FS002 (sem permissão)
  if (!c || !podeVer) {
    return {
      titulo: 'Chamado não disponível',
      html: html`<div class="pagina"><section class="card">${vazio(
        c ? 'Chamado não disponível' : 'Chamado não encontrado',
        c ? 'Este chamado não está disponível para o seu perfil.' : `Não existe chamado com o número ${params.id}.`,
        html`<a class="btn btn--contorno" href="#/">Voltar ao início</a>`,
      )}</section></div>`,
    };
  }

  const voltar = eSolicitante ? { href: '/chamados', texto: 'Voltar a Meus chamados' } : eTI ? { href: '/fila', texto: 'Voltar à fila' } : { href: '/historico', texto: 'Voltar ao histórico' };
  const painel = eSolicitante ? painelSolicitante(c) : eTI ? painelTI(c, usuario) : html``;

  const conteudo = html`
    <div class="pagina">
      <a class="voltar" href="#${voltar.href}">${icone('voltar')} ${voltar.texto}</a>
      <header class="cabecalho" style="align-items:flex-end">
        <div>
          <h1>${c.protocolo} · ${c.titulo}</h1>
          <p>Aberto ${eSolicitante ? 'por você' : `por ${nomeUsuario(c.solicitanteId)}`} em ${diaMesAsHora(c.criadoEm)}</p>
        </div>
        <div class="cabecalho__acoes" style="align-items:center">
          ${eSolicitante && c.status !== 'fechado' ? botaoReutilizar(c) : ''}
          ${seloStatus(c.status)}
        </div>
      </header>

      <div class="duas-colunas">
        <div class="pilha">
          ${etapas(c.status)}
          <section class="card">
            <h2>Descrição</h2>
            <p>${c.descricao}</p>
          </section>
          <section class="card">
            <h2>${eSolicitante ? 'Andamento' : 'Histórico do chamado'}</h2>
            ${linhaDoTempo(c)}
          </section>
        </div>
        <div class="pilha">
          ${eSolicitante ? painel : ''}
          ${cartaoDetalhes(c, !eSolicitante)}
          ${eSolicitante ? '' : painel}
        </div>
      </div>
    </div>`;

  const recarregar = () => navegar(`/chamados/${c.protocolo}`);

  return {
    titulo: `${c.protocolo} · ${c.titulo}`,
    html: conteudo,
    montar(raiz) {
      ligarContadores(raiz);

      raiz.querySelector('[data-confirmar]')?.addEventListener('click', () => {
        confirmarSolucao(c.protocolo);
        avisar('Obrigado! Chamado fechado.');
        recarregar();
      });

      raiz.querySelectorAll('[data-reabrir]').forEach((b) =>
        b.addEventListener('click', () =>
          abrirModal({
            titulo: `Reabrir ${c.protocolo}`,
            corpo: html`
              <p>Conte o que ainda está acontecendo. O atendimento anterior fica no histórico e o chamado volta para a fila como Aberto.</p>
              <div class="campo">
                <label for="motivo">Motivo da reabertura</label>
                <textarea class="textarea" id="motivo" name="motivo" maxlength="${LIMITE.historico_descricao}" placeholder="Ex.: o projetor voltou a desligar sozinho hoje"></textarea>
              </div>`,
            confirmar: 'Reabrir chamado',
            aoConfirmar(form) {
              const erro = reabrir(c.protocolo, lerFormulario(form).motivo ?? '');
              if (erro) return erro;
              avisar('Chamado reaberto e devolvido à fila.');
              recarregar();
              return null;
            },
          }),
        ),
      );

      raiz.querySelector('[data-assumir]')?.addEventListener('click', () => {
        assumir(c.protocolo);
        avisar('Você assumiu o chamado.');
        recarregar();
      });

      const formComentario = raiz.querySelector<HTMLFormElement>('[data-form-comentario]');
      formComentario?.addEventListener('submit', (e) => {
        e.preventDefault();
        const msg = lerFormulario(formComentario).mensagem;
        if (!mostrarErros(formComentario, msg.length < 3 ? { mensagem: 'Escreva a mensagem.' } : {})) return;
        comentar(c.protocolo, msg);
        avisar('Mensagem enviada para o suporte.');
        recarregar();
      });

      const formAtendimento = raiz.querySelector<HTMLFormElement>('[data-form-atendimento]');
      formAtendimento?.addEventListener('submit', (e) => {
        e.preventDefault();
        const d = lerFormulario(formAtendimento) as unknown as DadosAtendimento;
        if (!mostrarErros(formAtendimento, validarAtendimento(c, d))) return;
        registrarAtendimento(c.protocolo, d);
        avisar(d.status === 'resolvido' && c.status !== 'resolvido' ? 'Solução registrada. O solicitante vai confirmar.' : 'Atendimento registrado.');
        recarregar();
      });
    },
  };
}
