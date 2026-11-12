/** Painel do sino (tela 39 · Notificações abertas). */
import { html } from '@/core/dom';
import { relativo } from '@/core/format';
import { usuarioLogado } from '@/services/auth.service';
import { marcarComoLida, marcarTodasComoLidas, notificacoesDe } from '@/services/notificacoes.service';
import { navegar } from '@/app/router';

let painel: HTMLElement | null = null;

export function fecharNotificacoes(): void {
  painel?.remove();
  painel = null;
  document.removeEventListener('click', foraDoPainel, true);
}

function foraDoPainel(e: MouseEvent): void {
  const alvo = e.target as Element;
  if (painel && !painel.contains(alvo) && !alvo.closest?.('[data-sino]')) fecharNotificacoes();
}

export function alternarNotificacoes(botao: HTMLElement): void {
  if (painel) {
    fecharNotificacoes();
    return;
  }
  const usuario = usuarioLogado();
  if (!usuario) return;
  const lista = notificacoesDe(usuario.id).slice(0, 6);

  painel = document.createElement('section');
  painel.className = 'notificacoes';
  painel.setAttribute('aria-label', 'Notificações');
  painel.innerHTML = html`
    <header>
      <strong>Notificações</strong>
      <button type="button" class="link link--marca" data-todas>Marcar todas como lidas</button>
    </header>
    <ul>
      ${lista.length
        ? lista.map(
            (n) => html`
              <li>
                <button type="button" class="notificacao ${n.lida ? '' : 'nao-lida'}" data-id="${n.id}" data-chamado="${n.chamadoProtocolo}">
                  <span>${n.texto}</span>
                  <small>${relativo(n.data)}</small>
                </button>
              </li>`,
          )
        : html`<li class="vazio">Nenhuma notificação por enquanto.</li>`}
    </ul>
    <footer><a href="#/notificacoes">Ver todas as notificações</a></footer>`.valor;

  const r = botao.getBoundingClientRect();
  painel.style.top = `${r.bottom + 8}px`;
  painel.style.left = `${Math.max(12, Math.min(r.left, window.innerWidth - 412))}px`;
  document.body.append(painel);

  painel.addEventListener('click', (e) => {
    const alvo = e.target as HTMLElement;
    if (alvo.closest('[data-todas]')) {
      marcarTodasComoLidas(usuario.id);
      fecharNotificacoes();
      navegar(location.hash.slice(1) || '/');
      return;
    }
    const item = alvo.closest<HTMLElement>('[data-id]');
    if (item) {
      marcarComoLida(Number(item.dataset.id));
      fecharNotificacoes();
      navegar(`/chamados/${item.dataset.chamado}`);
    }
    if (alvo.closest('footer a')) fecharNotificacoes();
  });
  setTimeout(() => document.addEventListener('click', foraDoPainel, true));
}
