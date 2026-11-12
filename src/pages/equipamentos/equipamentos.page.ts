/** Tela 32 · Equipamentos (RF10, RF11 / UC10, UC11): consulta com filtros. */
import { html, qs, qsa } from '@/core/dom';
import { normalizar } from '@/core/format';
import { SITUACAO_LABEL } from '@/core/labels';
import type { Contexto, Pagina } from '@/app/router';
import { icone } from '@/components/icones';
import { cabecalho, seloSituacao, vazio } from '@/components/selos';
import { pode } from '@/services/permissoes.service';
import { chamadosDoEquipamento, listarEquipamentos, listarTipos } from '@/services/equipamentos.service';
import { listarLocais, nomeLocal } from '@/services/locais.service';
import { abasCadastro } from '../locais/locais.page';

export function paginaEquipamentos({ query }: Contexto): Pagina {
  const editar = pode('editar_cadastros');
  const f = { q: query.get('q') ?? '', tipo: query.get('tipo') ?? '', local: query.get('local') ?? '', situacao: query.get('situacao') ?? '' };

  const lista = listarEquipamentos()
    .filter((e) => !f.q || normalizar(`${e.patrimonio} ${e.codigoInterno ?? ''} ${e.tipo} ${e.marca} ${e.modelo} ${e.serie}`).includes(normalizar(f.q)))
    .filter((e) => !f.tipo || e.tipoId === Number(f.tipo))
    .filter((e) => !f.local || e.localId === Number(f.local))
    .filter((e) => !f.situacao || e.situacao === f.situacao);

  const conteudo = html`
    <div class="pagina">
      ${cabecalho(
        'Locais e equipamentos',
        editar ? 'Cadastro dos aparelhos ligados aos chamados.' : 'Consulta dos aparelhos (somente leitura).',
        editar ? html`<a class="btn btn--marca" href="#/equipamentos/novo">${icone('mais')} Novo equipamento</a>` : undefined,
      )}
      ${abasCadastro('equipamentos')}
      <form class="barra-filtros" data-filtros role="search">
        <div class="busca">
          ${icone('busca')}
          <label class="sr-only" for="q">Buscar equipamento</label>
          <input id="q" name="q" value="${f.q}" placeholder="Patrimônio, código, modelo ou nº de série" />
        </div>
        <select class="chip" name="tipo" aria-label="Tipo">
          <option value="">Tipo: Todos</option>
          ${listarTipos().map((t) => html`<option value="${t.id}" ${String(t.id) === f.tipo ? html`selected` : ''}>Tipo: ${t.nome}</option>`)}
        </select>
        <select class="chip" name="local" aria-label="Local">
          <option value="">Local: Todos</option>
          ${listarLocais(true).map((l) => html`<option value="${l.id}" ${String(l.id) === f.local ? html`selected` : ''}>Local: ${l.nome}</option>`)}
        </select>
        <select class="chip" name="situacao" aria-label="Situação">
          <option value="">Situação: Todas</option>
          ${Object.entries(SITUACAO_LABEL).map(([v, t]) => html`<option value="${v}" ${v === f.situacao ? html`selected` : ''}>Situação: ${t}</option>`)}
        </select>
      </form>
      <section class="card card--sem-padding">
        ${lista.length
          ? html`
              <div class="tabela-wrap">
                <table class="tabela tabela--responsiva">
                  <thead>
                    <tr><th>Patrimônio</th><th>Equipamento</th><th>Nº de série</th><th>Local</th><th>Situação</th><th>Chamados</th><th><span class="sr-only">Ações</span></th></tr>
                  </thead>
                  <tbody>
                    ${lista.map(
                      (e) => html`
                        <tr class="${e.situacao === 'inativo' ? 'apagada' : ''}">
                          <td class="num">${e.patrimonio || '—'}<span class="sub">Cód. ${e.codigoInterno ?? '—'}</span></td>
                          <td class="forte">${e.tipo} · ${e.marca} ${e.modelo}</td>
                          <td class="mudo num" data-rotulo="Série">${e.serie || '—'}</td>
                          <td data-rotulo="Local">${nomeLocal(e.localId)}</td>
                          <td>${seloSituacao(e.situacao)}</td>
                          <td class="num" data-rotulo="Chamados">${chamadosDoEquipamento(e.id)}</td>
                          <td style="text-align:right">${editar ? html`<a class="link--marca" href="#/equipamentos/${e.id}/editar">Editar</a>` : html`<a class="link" href="#/historico?q=${encodeURIComponent(e.patrimonio)}&dias=365">Histórico</a>`}</td>
                        </tr>`,
                    )}
                  </tbody>
                </table>
              </div>`
          : vazio('Nenhum registro encontrado', 'Não há equipamento para os critérios utilizados.')}
      </section>
    </div>`;

  return {
    titulo: 'Equipamentos',
    html: conteudo,
    montar(raiz) {
      const form = qs<HTMLFormElement>(raiz, '[data-filtros]');
      const aplicar = () => {
        const p = new URLSearchParams();
        const q = qs<HTMLInputElement>(form, '#q').value.trim();
        if (q) p.set('q', q);
        qsa<HTMLSelectElement>(form, 'select').forEach((s) => s.value && p.set(s.name, s.value));
        location.hash = `#/equipamentos${p.toString() ? `?${p}` : ''}`;
      };
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        aplicar();
      });
      qsa(form, 'select').forEach((s) => s.addEventListener('change', aplicar));
    },
  };
}
