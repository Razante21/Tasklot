/** Telas 37 e 38 · Indicadores (Equipe de TI e Gestão). */
import { html, type Seguro } from '@/core/dom';
import { baixarCSV } from '@/core/csv';
import { duracao, plural } from '@/core/format';
import { STATUS_LABEL, STATUS_ORDEM } from '@/core/labels';
import type { Contexto, Pagina } from '@/app/router';
import { icone } from '@/components/icones';
import { cabecalho, vazio } from '@/components/selos';
import { calcularIndicadores } from '@/services/chamados.service';
import { descreverEquipamento, obterEquipamento } from '@/services/equipamentos.service';
import { nomeLocal } from '@/services/locais.service';
import { pode } from '@/services/permissoes.service';

const PERIODOS: [string, string][] = [
  ['7', '7 dias'],
  ['30', '30 dias'],
  ['180', 'Semestre'],
];

function barras(itens: { rotulo: string; valor: number }[], cor: '' | 'marca' | 'cinza'): Seguro {
  const max = Math.max(1, ...itens.map((i) => i.valor));
  if (!itens.length) return html`<p class="mudo" style="font-size:13px">Sem chamados no período.</p>`;
  return html`
    <div class="barras">
      ${itens.map(
        (i) => html`
          <div class="barra">
            <span>${i.rotulo}</span>
            <span class="barra__trilho" aria-hidden="true"><span class="barra__valor ${cor ? `barra__valor--${cor}` : ''}" style="width:${Math.round((i.valor / max) * 100)}%;display:block"></span></span>
            <b class="num">${i.valor}</b>
          </div>`,
      )}
    </div>`;
}

export function paginaIndicadores({ query }: Contexto): Pagina {
  const dias = PERIODOS.some(([v]) => v === query.get('dias')) ? query.get('dias')! : '30';
  const ind = calcularIndicadores(Number(dias));
  const diff = ind.resolvidosPeriodo - ind.resolvidosAnterior;

  const conteudo = html`
    <div class="pagina">
      ${cabecalho(
        'Indicadores',
        pode('ver_fila') ? 'Visão geral do atendimento e da fila.' : 'Acompanhamento dos atendimentos do suporte de TI.',
        html`
          <nav class="barra-filtros" aria-label="Período">
            ${PERIODOS.map(([v, t]) => html`<a class="chip" href="#/indicadores?dias=${v}" aria-selected="${v === dias}">${t}</a>`)}
          </nav>
          <button type="button" class="btn btn--contorno" data-exportar>${icone('baixar')} Exportar relatório</button>`,
      )}

      <div class="numeros">
        <section class="card numero"><span>Abertos</span><b>${ind.abertos}</b><small>${plural(ind.semResponsavel, 'sem responsável', 'sem responsável')}</small></section>
        <section class="card numero"><span>Em andamento</span><b>${ind.emAndamento}</b><small>${ind.parados ? `${ind.parados} há mais de 3 dias` : 'nenhum parado'}</small></section>
        <section class="card numero"><span>Resolvidos no período</span><b>${ind.resolvidosPeriodo}</b><small>${diff === 0 ? 'igual ao período anterior' : `${diff > 0 ? '+' : ''}${diff} que o período anterior`}</small></section>
        <section class="card numero"><span>Tempo médio de solução</span><b>${duracao(ind.tempoMedioHoras)}</b><small>meta: até 2 dias</small></section>
      </div>

      <div class="lado-a-lado">
        <section class="card">
          <h2>Chamados por status</h2>
          ${barras(STATUS_ORDEM.map((s) => ({ rotulo: STATUS_LABEL[s], valor: ind.porStatus[s] })), '')}
        </section>
        <section class="card">
          <h2>Locais com mais ocorrências</h2>
          ${barras(ind.porLocal.map((l) => ({ rotulo: l.nome, valor: l.total })), 'marca')}
        </section>
      </div>

      <div class="duas-colunas">
        <section class="card">
          <h2>Equipamentos com falhas recorrentes</h2>
          ${ind.recorrentes.length
            ? ind.recorrentes.map((r) => {
                const e = obterEquipamento(r.equipamentoId);
                return html`
                  <div class="recorrente">
                    <div>
                      <strong>${e ? descreverEquipamento(e) : r.equipamentoId}</strong>
                      <small>${e ? `${nomeLocal(e.localId)} · ${e.patrimonio}` : ''}</small>
                    </div>
                    <span class="selo selo--marca">${r.total} chamados em ${dias} dias</span>
                  </div>`;
              })
            : vazio('Nenhuma falha recorrente', 'Nenhum equipamento teve 2 ou mais chamados no período.')}
        </section>
        <section class="card">
          <h2>Por tipo de aparelho</h2>
          ${barras(ind.porTipo.map((c) => ({ rotulo: c.nome, valor: c.total })), 'cinza')}
        </section>
      </div>
    </div>`;

  return {
    titulo: 'Indicadores',
    html: conteudo,
    montar(raiz) {
      raiz.querySelector('[data-exportar]')?.addEventListener('click', () => {
        baixarCSV(`tasklot-indicadores-${dias}dias.csv`, [
          ['Indicador', 'Valor'],
          ['Período (dias)', dias],
          ['Abertos agora', ind.abertos],
          ['Sem responsável', ind.semResponsavel],
          ['Em andamento', ind.emAndamento],
          ['Resolvidos no período', ind.resolvidosPeriodo],
          ['Tempo médio de solução (h)', ind.tempoMedioHoras.toFixed(1)],
          ...STATUS_ORDEM.map((s): [string, number] => [`Status: ${STATUS_LABEL[s]}`, ind.porStatus[s]]),
          ...ind.porLocal.map((l): [string, number] => [`Local: ${l.nome}`, l.total]),
          ...ind.porTipo.map((c): [string, number] => [`Tipo de aparelho: ${c.nome}`, c.total]),
        ]);
      });
    },
  };
}
