/**
 * Ponto de entrada do Tasklot.
 * Decide qual tela mostrar a cada mudança de endereço:
 * login → tela inicial do perfil → telas permitidas.
 */
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/pages.css';

import { html } from '@/core/dom';
import type { Usuario } from '@/core/types';
import { casar, iniciarRoteador, navegar, rotaAtual } from '@/app/router';
import { ROTAS } from '@/app/rotas';
import { montarMoldura, moldura } from '@/app/layout';
import { vazio } from '@/components/selos';
import { usuarioLogado } from '@/services/auth.service';
import { pode } from '@/services/permissoes.service';
import { telaLogin } from '@/pages/auth/login.page';
import { avisar } from '@/components/feedback';

const raiz = document.getElementById('app')!;

/** Primeira tela de cada perfil depois do login. */
function inicioDo(usuario: Usuario): string {
  if (pode('ver_fila', usuario)) return '/fila';
  if (pode('acompanhar_proprios', usuario)) return '/chamados';
  if (pode('ver_indicadores', usuario)) return '/indicadores';
  return '/perfil';
}

function renderizar(): void {
  const { caminho, query } = rotaAtual();
  const usuario = usuarioLogado();

  if (!usuario) {
    if (caminho !== '/login') return navegar('/login');
    const tela = telaLogin(() => navegar('/'));
    document.title = 'Entrar · Tasklot';
    raiz.innerHTML = tela.html;
    tela.montar(raiz);
    return;
  }

  if (caminho === '/' || caminho === '/login') return navegar(inicioDo(usuario));

  let encontrada = null as null | { rota: (typeof ROTAS)[number]; params: Record<string, string> };
  for (const rota of ROTAS) {
    const params = casar(rota.caminho, caminho);
    if (params) {
      encontrada = { rota, params };
      break;
    }
  }

  const semAcesso = encontrada?.rota.exige && !encontrada.rota.exige.some((p) => pode(p, usuario));
  const pagina =
    encontrada && !semAcesso
      ? encontrada.rota.pagina({ params: encontrada.params, query, usuario })
      : {
          titulo: 'Página não encontrada',
          html: html`<div class="pagina"><section class="card">${vazio(
            semAcesso ? 'Sem acesso a esta tela' : 'Página não encontrada',
            semAcesso ? 'Seu perfil não tem permissão para abrir esta tela.' : 'O endereço não existe.',
            html`<a class="btn btn--contorno" href="#/">Ir para o início</a>`,
          )}</section></div>`,
        };

  document.title = `${pagina.titulo} · Tasklot`;
  raiz.innerHTML = moldura(usuario, encontrada?.rota.menu, pagina.html).valor;
  montarMoldura(raiz);
  pagina.montar?.(raiz.querySelector<HTMLElement>('#conteudo')!);
  window.scrollTo(0, 0);
}

/**
 * RNF15 · Se uma ação falhar (ex.: armazenamento cheio), a transação já
 * desfez as mudanças; aqui avisamos o usuário em vez de falhar em silêncio.
 */
function avisarFalha(erro: unknown): void {
  const msg = erro instanceof Error ? erro.message : 'Algo deu errado. Nada foi alterado; tente de novo.';
  avisar(msg, 'erro');
}
window.addEventListener('error', (e) => avisarFalha(e.error));
window.addEventListener('unhandledrejection', (e) => avisarFalha(e.reason));

iniciarRoteador(renderizar);
