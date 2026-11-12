/** Telas 29 e 42 · Usuários (RF09, RF11 / UC11): Equipe de TI edita; Gestão só consulta. */
import { html, qs } from '@/core/dom';
import { normalizar, ultimoAcesso } from '@/core/format';
import type { Contexto, Pagina } from '@/app/router';
import { icone } from '@/components/icones';
import { cabecalho, vazio } from '@/components/selos';
import { listarPerfis, pode } from '@/services/permissoes.service';
import { listarUsuarios } from '@/services/usuarios.service';

export function paginaUsuarios({ query, usuario: eu }: Contexto): Pagina {
  const editar = pode('editar_cadastros');
  const todos = listarUsuarios();
  const perfis = listarPerfis();
  const f = { perfil: query.get('perfil') ?? '', situacao: query.get('situacao') ?? '', q: query.get('q') ?? '' };
  const lista = todos
    .filter((u) => !f.perfil || u.perfilId === Number(f.perfil))
    .filter((u) => !f.situacao || (f.situacao === 'ativo') === u.ativo)
    .filter((u) => !f.q || normalizar(`${u.nome} ${u.email} ${u.identificacao ?? ''}`).includes(normalizar(f.q)));

  const link = (mudar: Partial<typeof f>) => {
    const s = new URLSearchParams();
    Object.entries({ ...f, ...mudar }).forEach(([k, v]) => v && s.set(k, v));
    return `#/usuarios${s.toString() ? `?${s}` : ''}`;
  };

  const conteudo = html`
    <div class="pagina">
      ${cabecalho(
        'Usuários',
        editar ? 'Quem pode acessar o Tasklot e com qual perfil.' : 'Consulta de quem acessa o Tasklot (somente leitura).',
        editar ? html`<a class="btn btn--marca" href="#/usuarios/novo">${icone('mais')} Novo usuário</a>` : undefined,
      )}
      <div class="barra-filtros">
        <form class="busca" role="search">
          ${icone('busca')}
          <label class="sr-only" for="q">Buscar usuário</label>
          <input id="q" name="q" value="${f.q}" placeholder="Nome, e-mail ou identificação" />
        </form>
        <a class="chip" href="${link({ perfil: '' })}" aria-selected="${!f.perfil}">Todos · ${todos.length}</a>
        ${perfis.map((p) => html`<a class="chip" href="${link({ perfil: String(p.id) })}" aria-selected="${f.perfil === String(p.id)}">${p.nome} · ${todos.filter((u) => u.perfilId === p.id).length}</a>`)}
        <label class="sr-only" for="f-situacao">Situação</label>
        <select class="chip" id="f-situacao" data-situacao>
          ${[['', 'Situação: todas'], ['ativo', 'Situação: ativos'], ['inativo', 'Situação: inativos']].map(([v, t]) => html`<option value="${v}" ${v === f.situacao ? html`selected` : ''}>${t}</option>`)}
        </select>
      </div>
      <section class="card card--sem-padding">
        ${lista.length
          ? html`
              <div class="tabela-wrap">
                <table class="tabela tabela--responsiva">
                  <thead><tr><th>Nome</th><th>Identificação</th><th>Perfil</th><th>Contato</th><th>Situação</th><th>Último acesso</th><th><span class="sr-only">Ações</span></th></tr></thead>
                  <tbody>
                    ${lista.map(
                      (u) => html`
                        <tr class="${u.ativo ? '' : 'apagada'}">
                          <td class="forte">${u.nome}${u.id === eu.id ? ' (você)' : ''}<span class="sub">${u.email}</span></td>
                          <td class="num" data-rotulo="Identificação">${u.identificacao ?? '—'}</td>
                          <td data-rotulo="Perfil">${u.perfilNome}</td>
                          <td data-rotulo="Contato">${u.formaContato}: ${u.contato || '—'}</td>
                          <td>${u.ativo ? html`<span class="selo selo--operacional">Ativo</span>` : html`<span class="selo selo--inativo">Inativo</span>`}</td>
                          <td class="num" data-rotulo="Último acesso">${ultimoAcesso(u.ultimoAcesso ?? undefined)}</td>
                          <td style="text-align:right">${editar ? html`<a class="link--marca" href="#/usuarios/${u.id}/editar">Editar</a>` : ''}</td>
                        </tr>`,
                    )}
                  </tbody>
                </table>
              </div>`
          : vazio('Nenhum registro encontrado', 'Não há usuário para os critérios utilizados.')}
      </section>
      <p class="mudo" style="font-size:13px">Usuários inativos não entram no sistema e não aparecem em novos chamados, mas continuam no histórico.</p>
    </div>`;

  return {
    titulo: 'Usuários',
    html: conteudo,
    montar(raiz) {
      const form = qs<HTMLFormElement>(raiz, 'form.busca');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        location.hash = link({ q: qs<HTMLInputElement>(form, 'input').value.trim() });
      });
      qs<HTMLSelectElement>(raiz, '[data-situacao]').addEventListener('change', (e) => {
        location.hash = link({ situacao: (e.target as HTMLSelectElement).value });
      });
    },
  };
}
