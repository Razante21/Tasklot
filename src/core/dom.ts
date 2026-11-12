/**
 * Utilitários de DOM sem framework.
 * `html` monta strings de HTML escapando valores automaticamente,
 * para nunca injetar texto do usuário como HTML.
 */

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapar(valor: unknown): string {
  return String(valor ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

/** Marca um trecho como HTML confiável (já montado por nós). */
export class Seguro {
  constructor(public readonly valor: string) {}
  toString(): string {
    return this.valor;
  }
}

export const seguro = (valor: string): Seguro => new Seguro(valor);

type Valor = unknown;

function converter(v: Valor): string {
  if (v instanceof Seguro) return v.valor;
  if (Array.isArray(v)) return v.map(converter).join('');
  if (v === false || v === null || v === undefined) return '';
  return escapar(v);
}

/** Template tag: html`<p>${texto}</p>` → Seguro */
export function html(partes: TemplateStringsArray, ...valores: Valor[]): Seguro {
  let saida = '';
  partes.forEach((parte, i) => {
    saida += parte;
    if (i < valores.length) saida += converter(valores[i]);
  });
  return new Seguro(saida);
}

export function qs<T extends Element = HTMLElement>(raiz: ParentNode, seletor: string): T {
  const el = raiz.querySelector<T>(seletor);
  if (!el) throw new Error(`Elemento não encontrado: ${seletor}`);
  return el;
}

export function qsa<T extends Element = HTMLElement>(raiz: ParentNode, seletor: string): T[] {
  return Array.from(raiz.querySelectorAll<T>(seletor));
}

/** Lê os campos de um formulário como objeto simples. */
export function lerFormulario(form: HTMLFormElement): Record<string, string> {
  const dados: Record<string, string> = {};
  new FormData(form).forEach((valor, chave) => {
    dados[chave] = typeof valor === 'string' ? valor.trim() : '';
  });
  return dados;
}

/** Mostra erros embaixo de cada campo (data-erro="nome") e apaga cada um quando o campo é corrigido. */
export function mostrarErros(form: HTMLFormElement, erros: Record<string, string>): boolean {
  if (!form.dataset.limpaErros) {
    form.dataset.limpaErros = '1';
    const limpar = (e: Event) => {
      const campo = e.target as HTMLInputElement;
      if (!campo.name || !campo.hasAttribute('aria-invalid')) return;
      campo.removeAttribute('aria-invalid');
      const msg = form.querySelector<HTMLElement>(`[data-erro="${campo.name}"]`);
      if (msg) msg.textContent = '';
    };
    form.addEventListener('input', limpar);
    form.addEventListener('change', limpar);
  }
  qsa(form, '[data-erro]').forEach((el) => {
    const campo = el.dataset.erro!;
    el.textContent = erros[campo] ?? '';
    const input = form.elements.namedItem(campo);
    if (input instanceof HTMLElement) input.toggleAttribute('aria-invalid', Boolean(erros[campo]));
  });
  const primeiro = Object.keys(erros)[0];
  if (primeiro) {
    const input = form.elements.namedItem(primeiro);
    if (input instanceof HTMLElement) input.focus();
  }
  return Object.keys(erros).length === 0;
}
