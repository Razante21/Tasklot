/**
 * Campos de formulário reutilizáveis. O limite de caracteres vem do modelo
 * lógico (data/limites.ts) e aparece como contador embaixo do campo.
 */
import { html, type Seguro } from '@/core/dom';

interface OpcoesCampo {
  nome: string;
  rotulo: string;
  valor?: string | number | null;
  limite?: number;
  placeholder?: string;
  ajuda?: string;
  tipo?: string;
  modo?: 'numeric' | 'email' | 'text';
  desativado?: boolean;
}

function contador(nome: string, valor: string, limite?: number): Seguro {
  return limite ? html`<small class="contador" data-contador="${nome}">${valor.length}/${limite}</small>` : html``;
}

export function campoTexto(o: OpcoesCampo): Seguro {
  const valor = o.valor == null ? '' : String(o.valor);
  return html`
    <div class="campo">
      <label for="${o.nome}">${o.rotulo}</label>
      <input class="input" id="${o.nome}" name="${o.nome}" type="${o.tipo ?? 'text'}" value="${valor}"
        ${o.limite ? html`maxlength="${o.limite}"` : ''} ${o.modo ? html`inputmode="${o.modo}"` : ''}
        placeholder="${o.placeholder ?? ''}" ${o.desativado ? html`disabled` : ''} autocomplete="off" />
      <div class="campo__rodape">${o.ajuda ? html`<small>${o.ajuda}</small>` : html`<span></span>`}${contador(o.nome, valor, o.limite)}</div>
      <span class="erro" data-erro="${o.nome}"></span>
    </div>`;
}

export function campoArea(o: OpcoesCampo & { altura?: number }): Seguro {
  const valor = o.valor == null ? '' : String(o.valor);
  return html`
    <div class="campo">
      <label for="${o.nome}">${o.rotulo}</label>
      <textarea class="textarea" id="${o.nome}" name="${o.nome}" ${o.limite ? html`maxlength="${o.limite}"` : ''}
        placeholder="${o.placeholder ?? ''}" ${o.altura ? html`style="min-height:${o.altura}px"` : ''}>${valor}</textarea>
      <div class="campo__rodape">${o.ajuda ? html`<small>${o.ajuda}</small>` : html`<span></span>`}${contador(o.nome, valor, o.limite)}</div>
      <span class="erro" data-erro="${o.nome}"></span>
    </div>`;
}

export function campoSelect(o: OpcoesCampo & { opcoes: [string | number, string][]; vazio?: string }): Seguro {
  const valor = o.valor == null ? '' : String(o.valor);
  return html`
    <div class="campo">
      <label for="${o.nome}">${o.rotulo}</label>
      <select class="select" id="${o.nome}" name="${o.nome}" ${o.desativado ? html`disabled` : ''}>
        ${o.vazio !== undefined ? html`<option value="">${o.vazio}</option>` : ''}
        ${o.opcoes.map(([v, t]) => html`<option value="${v}" ${String(v) === valor ? html`selected` : ''}>${t}</option>`)}
      </select>
      ${o.ajuda ? html`<small>${o.ajuda}</small>` : ''}
      <span class="erro" data-erro="${o.nome}"></span>
    </div>`;
}

/** Atualiza os contadores "12/50" enquanto a pessoa digita. */
export function ligarContadores(raiz: HTMLElement): void {
  raiz.addEventListener('input', (e) => {
    const campo = e.target as HTMLInputElement | HTMLTextAreaElement;
    const cont = campo.name ? raiz.querySelector<HTMLElement>(`[data-contador="${campo.name}"]`) : null;
    if (cont && campo.maxLength > 0) {
      cont.textContent = `${campo.value.length}/${campo.maxLength}`;
      cont.classList.toggle('contador--cheio', campo.value.length >= campo.maxLength);
    }
  });
}
