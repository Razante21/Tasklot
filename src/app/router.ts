/**
 * Roteador por hash (#/chamados/T-0148).
 * Usa hash para funcionar em qualquer hospedagem estática, inclusive a Vercel,
 * sem precisar configurar redirecionamentos.
 */
import type { Seguro } from '@/core/dom';
import type { Permissao, Usuario } from '@/core/types';

export interface Contexto {
  params: Record<string, string>;
  query: URLSearchParams;
  usuario: Usuario;
}

export interface Pagina {
  /** Título da aba do navegador. */
  titulo: string;
  html: Seguro;
  /** Liga os eventos depois que o HTML entra na tela. */
  montar?: (raiz: HTMLElement) => void;
}

export interface Rota {
  caminho: string; // ex.: '/chamados/:id'
  /** Item do menu que fica marcado nesta rota. */
  menu?: string;
  /** Precisa de pelo menos uma destas permissões. */
  exige?: Permissao[];
  pagina: (ctx: Contexto) => Pagina;
}

export function rotaAtual(): { caminho: string; query: URLSearchParams } {
  const bruto = location.hash.replace(/^#/, '') || '/';
  const [caminho, busca = ''] = bruto.split('?');
  return { caminho: caminho || '/', query: new URLSearchParams(busca) };
}

export function casar(padrao: string, caminho: string): Record<string, string> | null {
  const a = padrao.split('/').filter(Boolean);
  const b = caminho.split('/').filter(Boolean);
  if (a.length !== b.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}

let aoMudar: () => void = () => {};

export function iniciarRoteador(renderizar: () => void): void {
  aoMudar = renderizar;
  window.addEventListener('hashchange', renderizar);
  renderizar();
}

export function navegar(caminho: string): void {
  const alvo = `#${caminho}`;
  if (location.hash === alvo) aoMudar();
  else location.hash = alvo;
}
