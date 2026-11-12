/** Pequenos pedaços de interface usados em várias telas. */
import { html, type Seguro } from '@/core/dom';
import { PRIORIDADE_LABEL, SITUACAO_LABEL, STATUS_LABEL } from '@/core/labels';
import { iniciais } from '@/core/format';
import type { Prioridade, SituacaoEquipamento, StatusChamado } from '@/core/types';

export const seloStatus = (s: StatusChamado): Seguro => html`<span class="selo selo--ponto selo--${s}">${STATUS_LABEL[s]}</span>`;

export const seloSituacao = (s: SituacaoEquipamento): Seguro =>
  html`<span class="selo selo--ponto selo--${s}">${SITUACAO_LABEL[s]}</span>`;

export const textoPrioridade = (p: Prioridade): Seguro =>
  html`<span class="${p === 'alta' ? 'prioridade--alta' : ''}">${PRIORIDADE_LABEL[p]}</span>`;

export const avatar = (nome: string, grande = false): Seguro =>
  html`<span class="avatar ${grande ? 'avatar--grande' : ''}" aria-hidden="true">${iniciais(nome)}</span>`;

export function cabecalho(titulo: string, subtitulo: string, acoes?: Seguro): Seguro {
  return html`
    <header class="cabecalho">
      <div>
        <h1>${titulo}</h1>
        <p>${subtitulo}</p>
      </div>
      ${acoes ? html`<div class="cabecalho__acoes">${acoes}</div>` : ''}
    </header>`;
}

export function vazio(titulo: string, texto: string, acao?: Seguro): Seguro {
  return html`
    <div class="vazio">
      <img src="/logo.svg" alt="" />
      <strong>${titulo}</strong>
      <p>${texto}</p>
      ${acao ? html`<div style="margin-top:16px">${acao}</div>` : ''}
    </div>`;
}

/** RNF04 · orientação de contingência quando o sistema estiver fora do ar. */
export function contingencia(): Seguro {
  return html`
    <aside class="contingencia" aria-label="Se o sistema estiver fora do ar">
      <strong>Sistema fora do ar?</strong>
      Registre o problema pelo ramal 300 ou pelo e-mail suporte@fatec.sp.gov.br. A Equipe de TI lança o chamado aqui quando o sistema voltar.
    </aside>`;
}
