/** Tabela de chamados usada em Meus chamados e Histórico. */
import { html, type Seguro } from '@/core/dom';
import { diaMes } from '@/core/format';
import type { Chamado } from '@/core/types';
import { obterEquipamento } from '@/services/equipamentos.service';
import { ultimaSolucao } from '@/services/chamados.service';
import { nomeLocal } from '@/services/locais.service';
import { nomeUsuario } from '@/services/usuarios.service';
import { seloStatus, textoPrioridade } from './selos';

export function localEAparelho(c: Chamado): string {
  const eq = obterEquipamento(c.equipamentoId);
  return `${nomeLocal(c.localId)} · ${eq ? eq.tipo : 'Sem aparelho'}`;
}

export function tabelaChamados(lista: Chamado[], opcoes: { mostrarSolicitante?: boolean; mostrarSolucao?: boolean } = {}): Seguro {
  return html`
    <div class="tabela-wrap">
      <table class="tabela tabela--responsiva">
        <thead>
          <tr>
            <th>Nº</th>
            <th>Título</th>
            ${opcoes.mostrarSolicitante ? html`<th>Solicitante</th>` : ''}
            <th>Local · Aparelho</th>
            ${opcoes.mostrarSolucao ? html`<th>Solução aplicada</th>` : html`<th>Prioridade</th>`}
            <th>Status</th>
            <th>Data</th>
          </tr>
        </thead>
        <tbody>
          ${lista.map(
            (c) => html`
              <tr data-href="/chamados/${c.protocolo}">
                <td class="id">${c.protocolo}</td>
                <td class="forte"><a href="#/chamados/${c.protocolo}" style="text-decoration:none">${c.titulo}</a></td>
                ${opcoes.mostrarSolicitante ? html`<td data-rotulo="Solicitante">${nomeUsuario(c.solicitanteId)}</td>` : ''}
                <td class="mudo">${localEAparelho(c)}</td>
                ${opcoes.mostrarSolucao
                  ? html`<td data-rotulo="Solução" class="mudo">${ultimaSolucao(c)?.solucao || '—'}</td>`
                  : html`<td data-rotulo="Prioridade">${textoPrioridade(c.prioridade)}</td>`}
                <td>${seloStatus(c.status)}</td>
                <td class="mudo num" data-rotulo="Aberto em">${diaMes(c.criadoEm)}</td>
              </tr>`,
          )}
        </tbody>
      </table>
    </div>`;
}

/** Clique na linha inteira abre o chamado. */
export function ligarLinhasClicaveis(raiz: HTMLElement): void {
  raiz.addEventListener('click', (e) => {
    const alvo = e.target as HTMLElement;
    if (alvo.closest('a, button')) return;
    const linha = alvo.closest<HTMLElement>('tr[data-href]');
    if (linha) location.hash = `#${linha.dataset.href}`;
  });
}
