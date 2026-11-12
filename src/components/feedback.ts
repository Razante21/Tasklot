/** Avisos rápidos (toast) e janelas de confirmação (modal). */
import { html, type Seguro } from '@/core/dom';

export function avisar(texto: string, tipo: 'ok' | 'erro' = 'ok'): void {
  let area = document.querySelector<HTMLElement>('.toasts');
  if (!area) {
    area = document.createElement('div');
    area.className = 'toasts';
    area.setAttribute('role', 'status');
    area.setAttribute('aria-live', 'polite');
    document.body.append(area);
  }
  const t = document.createElement('div');
  t.className = `toast ${tipo === 'erro' ? 'toast--erro' : ''}`;
  t.textContent = texto;
  area.append(t);
  setTimeout(() => t.remove(), 3500);
}

interface OpcoesModal {
  titulo: string;
  corpo: Seguro;
  confirmar: string;
  cancelar?: string;
  perigo?: boolean;
  /** Retorne uma mensagem de erro para manter o modal aberto. */
  aoConfirmar?: (form: HTMLFormElement) => string | null | void;
}

export function abrirModal(op: OpcoesModal): void {
  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  fundo.innerHTML = html`
    <form class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-titulo" novalidate>
      <h2 id="modal-titulo">${op.titulo}</h2>
      ${op.corpo}
      <p class="aviso aviso--erro" data-modal-erro></p>
      <div class="acoes-form">
        ${op.cancelar !== '' ? html`<button type="button" class="btn btn--contorno" data-fechar>${op.cancelar ?? 'Cancelar'}</button>` : ''}
        <button type="submit" class="btn ${op.perigo ? 'btn--perigo' : 'btn--escuro'}">${op.confirmar}</button>
      </div>
    </form>`.valor;

  const anterior = document.activeElement as HTMLElement | null;
  const fechar = () => {
    fundo.remove();
    document.removeEventListener('keydown', aoTeclar);
    anterior?.focus();
  };
  const aoTeclar = (e: KeyboardEvent) => {
    if (e.key === 'Escape') fechar();
  };

  const form = fundo.querySelector('form')!;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const erro = op.aoConfirmar?.(form);
    if (erro) {
      fundo.querySelector('[data-modal-erro]')!.textContent = erro;
      return;
    }
    fechar();
  });
  fundo.querySelector('[data-fechar]')?.addEventListener('click', fechar);
  fundo.addEventListener('click', (e) => {
    if (e.target === fundo) fechar();
  });
  document.addEventListener('keydown', aoTeclar);
  document.body.append(fundo);
  (form.querySelector('textarea, input, select') as HTMLElement | null ?? form.querySelector<HTMLElement>('[type=submit]'))?.focus();
}
