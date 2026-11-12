/**
 * Telas 09, 46 e 47 · Histórico (RF08 / UC08): chamados encerrados,
 * soluções aplicadas e problema recorrente em destaque.
 */
import { html, qs, qsa } from '@/core/dom';
import { normalizar, plural } from '@/core/format';
import type { Chamado } from '@/core/types';
import type { Contexto, Pagina } from '@/app/router';
import { icone } from '@/components/icones';
import { cabecalho, vazio } from '@/components/selos';
import { ligarLinhasClicaveis, tabelaChamados } from '@/components/tabela-chamados';
import { encerrado, listarChamados, ultimaSolucao } from '@/services/chamados.service';
import { descreverEquipamento, listarTipos, obterEquipamento } from '@/services/equipamentos.service';
import { listarLocais, nomeLocal } from '@/services/locais.service';
import { pode } from '@/services/permissoes.service';

/** Aparelho com mais chamados nos últimos 30 dias. */
function recorrente(lista: Chamado[]): { titulo: string; total: number } | null {
  const limite = Date.now() - 30 * 864e5;
  const contagem = new Map<number, number>();
  lista
    .filter((c) => c.equipamentoId && new Date(c.criadoEm).getTime() >= limite)
    .forEach((c) => contagem.set(c.equipamentoId!, (contagem.get(c.equipamentoId!) ?? 0) + 1));
  const [id, total] = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (!id || total < 2) return null;
  const eq = obterEquipamento(id);
  return { titulo: `${eq?.tipo ?? 'Aparelho'} · ${nomeLocal(eq?.localId)}`, total };
}

export function paginaHistorico({ usuario, query }: Contexto): Pagina {
  // UC08 · FS002: solicitantes veem só os próprios; TI e Gestão veem todos.
  const veTodos = pode('ver_fila') || pode('ver_indicadores');
  const base = listarChamados().filter((c) => veTodos || c.solicitanteId === usuario.id);
  const finalizados = base.filter(encerrado);

  const f = { q: query.get('q') ?? '', local: query.get('local') ?? '', tipo: query.get('tipo') ?? '', dias: query.get('dias') ?? '90' };
  const limite = Date.now() - Number(f.dias) * 864e5;
  const lista = finalizados
    .filter((c) => {
      if (!f.q) return true;
      const eq = obterEquipamento(c.equipamentoId);
      const texto = `${c.protocolo} ${c.titulo} ${nomeLocal(c.localId)} ${descreverEquipamento(eq)} ${eq?.patrimonio ?? ''} ${ultimaSolucao(c)?.solucao ?? ''}`;
      return normalizar(texto).includes(normalizar(f.q));
    })
    .filter((c) => !f.local || c.localId === Number(f.local))
    .filter((c) => !f.tipo || obterEquipamento(c.equipamentoId)?.tipoId === Number(f.tipo))
    .filter((c) => new Date(c.criadoEm).getTime() >= limite);

  const rec = recorrente(base);

  const conteudo = html`
    <div class="pagina">
      ${cabecalho('Histórico de chamados', 'Consulte atendimentos anteriores, as soluções aplicadas e problemas que se repetem.')}
      <div class="lado-a-lado">
        <section class="card numero ${rec ? 'destaque-marca' : ''}">
          <span class="rotulo-caps">Problema recorrente</span>
          <b style="font-size:18px">${rec ? rec.titulo : 'Nenhum no momento'}</b>
          <small>${rec ? `${rec.total} chamados nos últimos 30 dias` : 'Nenhum aparelho com 2 ou mais chamados em 30 dias'}</small>
        </section>
        <section class="card numero">
          <span class="rotulo-caps">Finalizados</span>
          <b style="font-size:18px">${plural(finalizados.length, 'chamado', 'chamados')}</b>
          <small>Resolvidos ou fechados</small>
        </section>
      </div>

      <form class="barra-filtros" data-filtros role="search">
        <div class="busca">
          ${icone('busca')}
          <label class="sr-only" for="q">Buscar</label>
          <input id="q" name="q" value="${f.q}" placeholder="Título, local, aparelho ou solução" />
        </div>
        <select class="chip" name="local" aria-label="Local">
          <option value="">Local: todos</option>
          ${listarLocais(true).map((l) => html`<option value="${l.id}" ${String(l.id) === f.local ? html`selected` : ''}>Local: ${l.nome}</option>`)}
        </select>
        <select class="chip" name="tipo" aria-label="Tipo de aparelho">
          <option value="">Aparelho: todos</option>
          ${listarTipos().map((t) => html`<option value="${t.id}" ${String(t.id) === f.tipo ? html`selected` : ''}>Aparelho: ${t.nome}</option>`)}
        </select>
        <select class="chip" name="dias" aria-label="Período">
          ${[['30', 'Últimos 30 dias'], ['90', 'Últimos 90 dias'], ['365', 'Último ano']].map(([v, t]) => html`<option value="${v}" ${v === f.dias ? html`selected` : ''}>${t}</option>`)}
        </select>
      </form>

      <section class="card card--sem-padding">
        ${lista.length
          ? tabelaChamados(lista, { mostrarSolicitante: veTodos, mostrarSolucao: true })
          : vazio('Nenhum registro encontrado', 'Não existem chamados encerrados para os critérios utilizados.')}
      </section>
    </div>`;

  return {
    titulo: 'Histórico',
    html: conteudo,
    montar(raiz) {
      ligarLinhasClicaveis(raiz);
      const form = qs<HTMLFormElement>(raiz, '[data-filtros]');
      const aplicar = () => {
        const p = new URLSearchParams();
        const q = qs<HTMLInputElement>(form, '#q').value.trim();
        if (q) p.set('q', q);
        qsa<HTMLSelectElement>(form, 'select').forEach((s) => s.value && !(s.name === 'dias' && s.value === '90') && p.set(s.name, s.value));
        location.hash = `#/historico${p.toString() ? `?${p}` : ''}`;
      };
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        aplicar();
      });
      qsa(form, 'select').forEach((s) => s.addEventListener('change', aplicar));
    },
  };
}
