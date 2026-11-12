/** Telas 02 e 21 · Meus chamados (com abas por status, busca e estado vazio). */
import { html, qs } from '@/core/dom';
import { normalizar } from '@/core/format';
import { STATUS_LABEL } from '@/core/labels';
import type { StatusChamado } from '@/core/types';
import type { Contexto, Pagina } from '@/app/router';
import { icone } from '@/components/icones';
import { cabecalho, vazio } from '@/components/selos';
import { ligarLinhasClicaveis, tabelaChamados } from '@/components/tabela-chamados';
import { chamadosDoSolicitante } from '@/services/chamados.service';
import { pode } from '@/services/permissoes.service';

const ABAS: (StatusChamado | 'todos')[] = ['todos', 'aberto', 'em_andamento', 'resolvido', 'fechado'];
const ROTULO_ABA: Record<string, string> = { todos: 'Todos', aberto: 'Abertos', em_andamento: 'Em andamento', resolvido: 'Resolvidos', fechado: 'Fechados' };

export function paginaMeusChamados({ usuario, query }: Contexto): Pagina {
  const todos = chamadosDoSolicitante(usuario.id);
  const aba = (query.get('status') as StatusChamado | null) ?? 'todos';
  const termo = query.get('q') ?? '';
  const filtrados = todos
    .filter((c) => aba === 'todos' || c.status === aba)
    .filter((c) => !termo || normalizar(`${c.protocolo} ${c.titulo}`).includes(normalizar(termo)));
  const aguardando = todos.filter((c) => c.status === 'resolvido');
  const botaoNovo = pode('abrir_chamado')
    ? html`<a class="btn btn--marca" href="#/chamados/novo">${icone('mais')} Novo chamado</a>`
    : html``;

  const conteudo = html`
    <div class="pagina">
      ${cabecalho('Meus chamados', 'Acompanhe o andamento das suas solicitações.', botaoNovo)}

      ${aguardando.length
        ? html`
            <div class="faixa" role="status">
              <div>
                <strong>${aguardando.length === 1 ? `O chamado ${aguardando[0].protocolo} foi resolvido.` : `${aguardando.length} chamados foram resolvidos.`}</strong>
                <span>Confirme se o problema acabou ou reabra informando o motivo.</span>
              </div>
              <a class="btn btn--escuro btn--pequeno" href="#/chamados/${aguardando[0].protocolo}">Ver e confirmar</a>
            </div>`
        : ''}

      ${todos.length
        ? html`
            <div class="barra-filtros">
              <div class="barra-filtros" role="tablist" aria-label="Filtrar por status">
                ${ABAS.map((a) => {
                  const n = a === 'todos' ? todos.length : todos.filter((c) => c.status === a).length;
                  return html`<a class="chip" role="tab" aria-selected="${a === aba}" href="#/chamados${a === 'todos' ? '' : `?status=${a}`}">${ROTULO_ABA[a]} (${n})</a>`;
                })}
              </div>
              <form class="busca" role="search" style="margin-left:auto">
                ${icone('busca')}
                <label class="sr-only" for="busca">Buscar chamado</label>
                <input id="busca" name="q" value="${termo}" placeholder="Buscar por título ou nº" />
              </form>
            </div>
            <section class="card card--sem-padding">
              ${filtrados.length
                ? tabelaChamados(filtrados)
                : vazio('Nada por aqui', termo ? `Nenhum chamado com "${termo}".` : `Você não tem chamados ${STATUS_LABEL[aba as StatusChamado]?.toLowerCase() ?? ''}.`)}
            </section>`
        : html`
            <section class="card">
              ${vazio(
                'Nenhum chamado por aqui',
                'Quando algo de TI não funcionar na sua sala, abra um chamado e acompanhe por esta tela.',
                botaoNovo,
              )}
            </section>`}
    </div>`;

  return {
    titulo: 'Meus chamados',
    html: conteudo,
    montar(raiz) {
      ligarLinhasClicaveis(raiz);
      const form = raiz.querySelector<HTMLFormElement>('form.busca');
      form?.addEventListener('submit', (e) => {
        e.preventDefault();
        const q = qs<HTMLInputElement>(form, 'input').value.trim();
        const p = new URLSearchParams();
        if (aba !== 'todos') p.set('status', aba);
        if (q) p.set('q', q);
        location.hash = `#/chamados${p.toString() ? `?${p}` : ''}`;
      });
    },
  };
}
