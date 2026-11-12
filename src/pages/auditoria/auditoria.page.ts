/** Tela 36 · Registro de auditoria. */
import { html, qs, qsa } from '@/core/dom';
import { baixarCSV } from '@/core/csv';
import { dataHoraCompleta, normalizar } from '@/core/format';
import { ACAO_LABEL } from '@/core/labels';
import type { AcaoAuditoria } from '@/core/types';
import type { Contexto, Pagina } from '@/app/router';
import { icone } from '@/components/icones';
import { cabecalho, vazio } from '@/components/selos';
import { listarAuditoria } from '@/services/auditoria.service';
import { listarUsuarios, nomeUsuario } from '@/services/usuarios.service';

const COR_ACAO: Record<AcaoAuditoria, string> = {
  criacao: 'operacional',
  edicao: 'fora_de_uso',
  inativacao: 'inativo',
  exclusao: 'marca',
  permissao: 'em_manutencao',
};

export function paginaAuditoria({ query }: Contexto): Pagina {
  const f = { q: query.get('q') ?? '', dias: query.get('dias') ?? '30', acao: query.get('acao') ?? '', resp: query.get('resp') ?? '' };
  const limite = Date.now() - Number(f.dias) * 864e5;
  const lista = listarAuditoria()
    .filter((a) => new Date(a.data).getTime() >= limite)
    .filter((a) => !f.acao || a.acao === f.acao)
    .filter((a) => !f.resp || a.responsavelId === Number(f.resp))
    .filter((a) => !f.q || normalizar(`${a.registro} ${a.detalhe} ${nomeUsuario(a.responsavelId)}`).includes(normalizar(f.q)));
  const responsaveis = listarUsuarios().filter((u) => listarAuditoria().some((a) => a.responsavelId === u.id));

  const conteudo = html`
    <div class="pagina">
      ${cabecalho('Registro de auditoria', 'Quem alterou cadastros e permissões, e quando.', html`<button type="button" class="btn btn--contorno" data-exportar>${icone('baixar')} Exportar CSV</button>`)}
      <form class="barra-filtros" data-filtros role="search">
        <div class="busca">
          ${icone('busca')}
          <label class="sr-only" for="q">Buscar</label>
          <input id="q" name="q" value="${f.q}" placeholder="Buscar por registro ou responsável" />
        </div>
        <select class="chip" name="dias" aria-label="Período">
          ${[['7', 'Últimos 7 dias'], ['30', 'Últimos 30 dias'], ['365', 'Último ano']].map(([v, t]) => html`<option value="${v}" ${v === f.dias ? html`selected` : ''}>Período: ${t}</option>`)}
        </select>
        <select class="chip" name="acao" aria-label="Ação">
          <option value="">Ação: Todas</option>
          ${Object.entries(ACAO_LABEL).map(([v, t]) => html`<option value="${v}" ${v === f.acao ? html`selected` : ''}>Ação: ${t}</option>`)}
        </select>
        <select class="chip" name="resp" aria-label="Responsável">
          <option value="">Responsável: Todos</option>
          ${responsaveis.map((u) => html`<option value="${u.id}" ${String(u.id) === f.resp ? html`selected` : ''}>Responsável: ${u.nome}</option>`)}
        </select>
      </form>
      <section class="card card--sem-padding">
        ${lista.length
          ? html`
              <div class="tabela-wrap">
                <table class="tabela tabela--responsiva">
                  <thead><tr><th>Data e hora</th><th>Responsável</th><th>Ação</th><th>Registro</th><th>Detalhe</th></tr></thead>
                  <tbody>
                    ${lista.map(
                      (a) => html`
                        <tr>
                          <td class="num">${dataHoraCompleta(a.data)}</td>
                          <td data-rotulo="Por">${nomeUsuario(a.responsavelId)}</td>
                          <td><span class="selo selo--${COR_ACAO[a.acao]}">${ACAO_LABEL[a.acao]}</span></td>
                          <td class="forte">${a.registro}</td>
                          <td class="mudo">${a.detalhe}</td>
                        </tr>`,
                    )}
                  </tbody>
                </table>
              </div>`
          : vazio('Nenhum registro', 'Nada foi alterado com esses filtros.')}
      </section>
    </div>`;

  return {
    titulo: 'Auditoria',
    html: conteudo,
    montar(raiz) {
      const form = qs<HTMLFormElement>(raiz, '[data-filtros]');
      const aplicar = () => {
        const p = new URLSearchParams();
        const q = qs<HTMLInputElement>(form, '#q').value.trim();
        if (q) p.set('q', q);
        qsa<HTMLSelectElement>(form, 'select').forEach((s) => s.value && !(s.name === 'dias' && s.value === '30') && p.set(s.name, s.value));
        location.hash = `#/auditoria${p.toString() ? `?${p}` : ''}`;
      };
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        aplicar();
      });
      qsa(form, 'select').forEach((s) => s.addEventListener('change', aplicar));
      qs(raiz, '[data-exportar]').addEventListener('click', () =>
        baixarCSV('tasklot-auditoria.csv', [
          ['Data e hora', 'Responsável', 'Ação', 'Registro', 'Detalhe'],
          ...lista.map((a) => [dataHoraCompleta(a.data), nomeUsuario(a.responsavelId), ACAO_LABEL[a.acao], a.registro, a.detalhe]),
        ]),
      );
    },
  };
}
