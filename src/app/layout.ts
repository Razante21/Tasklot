/** Moldura das telas internas: menu lateral, sino, cartão do usuário e barra do celular. */
import { html, type Seguro } from '@/core/dom';
import type { Usuario } from '@/core/types';
import { icone } from '@/components/icones';
import { avatar } from '@/components/selos';
import { alternarNotificacoes, fecharNotificacoes } from '@/components/notificacoes';
import { naoLidas } from '@/services/notificacoes.service';
import { pode } from '@/services/permissoes.service';
import { MENU, type ItemMenu } from './menu';

function itemMenu(item: ItemMenu, ativo: string | undefined): Seguro {
  return html`
    <a class="nav__item" href="#${item.caminho}" ${ativo === item.id ? html`aria-current="page"` : ''}>
      ${icone(item.icone)}<span>${item.rotulo}</span>
    </a>`;
}

function botaoSino(usuario: Usuario): Seguro {
  const n = naoLidas(usuario.id);
  return html`
    <button type="button" class="btn btn--icone sino" data-sino aria-label="Notificações${n ? ` (${n} não lidas)` : ''}">
      ${icone('sino')}${n ? html`<span class="ponto-alerta"></span>` : ''}
    </button>`;
}

export function moldura(usuario: Usuario, menuAtivo: string | undefined, conteudo: Seguro): Seguro {
  const itens = MENU.filter((i) => !i.exige || i.exige.some((p) => pode(p, usuario)));
  const principais = itens.filter((i) => !i.grupo);
  const admin = itens.filter((i) => i.grupo === 'administracao');

  return html`
    <div class="app" data-menu="fechado">
      <div class="topo-movel">
        <button type="button" class="btn btn--icone" data-abrir-menu aria-label="Abrir menu">${icone('menu')}</button>
        <a class="marca" href="#/"><img src="/logo.svg" alt="" /><span>Tasklot</span></a>
        ${botaoSino(usuario)}
      </div>
      <div class="fundo-menu" data-fechar-menu></div>

      <aside class="sidebar" aria-label="Menu principal">
        <div class="sidebar__topo">
          <a class="marca" href="#/"><img src="/logo.svg" alt="" /><span>Tasklot</span></a>
          ${botaoSino(usuario)}
        </div>
        <nav class="nav">
          ${principais.map((i) => itemMenu(i, menuAtivo))}
          ${admin.length ? html`<p class="nav__grupo">Administração</p>${admin.map((i) => itemMenu(i, menuAtivo))}` : ''}
        </nav>
        <a class="cartao-usuario" href="#/perfil" ${menuAtivo === 'perfil' ? html`aria-current="page"` : ''}>
          ${avatar(usuario.nome)}
          <span>
            <strong>${usuario.perfilNome}</strong>
            <small>${usuario.nome} · Fatec Indaiatuba</small>
          </span>
        </a>
      </aside>

      <main class="conteudo" id="conteudo" tabindex="-1">${conteudo}</main>
    </div>`;
}

/** Eventos da moldura (menu do celular e sino). */
export function montarMoldura(raiz: HTMLElement): void {
  const app = raiz.querySelector<HTMLElement>('.app');
  if (!app) return;
  // O .app é recriado a cada navegação, então o ouvinte não se acumula.
  app.addEventListener('click', (e) => {
    const alvo = e.target as HTMLElement;
    if (alvo.closest('[data-abrir-menu]')) app.dataset.menu = 'aberto';
    if (alvo.closest('[data-fechar-menu]') || alvo.closest('.nav__item, .cartao-usuario')) app.dataset.menu = 'fechado';
    const sino = alvo.closest<HTMLElement>('[data-sino]');
    if (sino) alternarNotificacoes(sino);
  });
  fecharNotificacoes();
}
