/**
 * Tela 07 · Fila de chamados (RF05, RF16 / UC05, UC16) — Equipe de TI.
 * Filtros: prioridade, solicitante, aparelho, local, responsável e período;
 * as colunas do quadro são os status.
 */
import { html, qs, qsa, type Seguro } from '@/core/dom';
import { normalizar } from '@/core/format';
import { PRIORIDADE_LABEL, STATUS_LABEL, STATUS_ORDEM } from '@/core/labels';
import type { Chamado, Prioridade, StatusChamado } from '@/core/types';
import type { Contexto, Pagina } from '@/app/router';
import { icone } from '@/components/icones';
import { cabecalho, vazio } from '@/components/selos';
import { abrirModal, avisar } from '@/components/feedback';
import { campoTexto } from '@/components/campos';
import { LIMITE } from '@/data/limites';
import { navegar } from '@/app/router';
import { pode } from '@/services/permissoes.service';
import { listarChamados, moverChamado, obterChamado } from '@/services/chamados.service';
import { listarEquipamentos, obterEquipamento } from '@/services/equipamentos.service';
import { listarLocais, nomeLocal } from '@/services/locais.service';
import { listarUsuarios, nomeUsuario } from '@/services/usuarios.service';

const PESO: Record<Prioridade, number> = { alta: 0, media: 1, baixa: 2 };

function tiquete(c: Chamado, arrastavel: boolean): Seguro {
  const eq = obterEquipamento(c.equipamentoId);
  return html`
    <a class="tiquete" href="#/chamados/${c.protocolo}" data-protocolo="${c.protocolo}" ${arrastavel ? html`draggable="true"` : ''}>
      <span class="tiquete__topo"><span>${c.protocolo}</span><span class="${c.prioridade === 'alta' ? 'prioridade--alta' : ''}">${PRIORIDADE_LABEL[c.prioridade]}</span></span>
      <strong>${c.titulo}</strong>
      <small>${nomeLocal(c.localId)} · ${eq ? eq.tipo : 'Sem aparelho'}</small>
      <small>${nomeUsuario(c.solicitanteId)}</small>
      <small class="${c.responsavelId ? '' : 'sem-resp'}">${c.responsavelId ? `Com ${nomeUsuario(c.responsavelId)}` : 'Sem responsável'}</small>
    </a>`;
}

function seletor(nome: string, rotulo: string, valor: string, opcoes: [string | number, string][]): Seguro {
  return html`
    <label class="sr-only" for="f-${nome}">${rotulo}</label>
    <select class="chip" id="f-${nome}" name="${nome}">
      ${opcoes.map(([v, t]) => html`<option value="${v}" ${String(v) === valor ? html`selected` : ''}>${rotulo}: ${t}</option>`)}
    </select>`;
}

/** Atualiza a fila na tela depois de uma mudança de status. */
const recarregar = () => navegar(location.hash.replace(/^#/, '') || '/fila');

/**
 * Arrastar e soltar (como no Trello): soltar o cartão em qualquer coluna
 * muda o status. "Resolvido" abre uma janela pedindo a solução (obrigatória).
 */
function ligarArrastar(raiz: HTMLElement): void {
  let arrastando: { protocolo: string; origem: StatusChamado } | null = null;
  const colunas = qsa(raiz, '.coluna');
  const limpar = () => colunas.forEach((c) => c.classList.remove('coluna--aceita', 'coluna--sobre'));

  qsa(raiz, '.tiquete[draggable="true"]').forEach((t) => {
    t.addEventListener('dragstart', (e) => {
      const protocolo = t.dataset.protocolo!;
      const origem = t.closest<HTMLElement>('.coluna')!.dataset.status as StatusChamado;
      arrastando = { protocolo, origem };
      e.dataTransfer?.setData('text/plain', protocolo);
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
      t.classList.add('tiquete--arrastando');
      colunas.forEach((c) => {
        const s = c.dataset.status as StatusChamado;
        if (s !== origem) c.classList.add('coluna--aceita');
      });
    });
    t.addEventListener('dragend', () => {
      arrastando = null;
      t.classList.remove('tiquete--arrastando');
      limpar();
    });
  });

  colunas.forEach((col) => {
    const destino = col.dataset.status as StatusChamado;
    col.addEventListener('dragover', (e) => {
      if (!arrastando) return;
      e.preventDefault(); // sem isso o navegador não deixa soltar
      col.classList.add('coluna--sobre');
    });
    col.addEventListener('dragleave', (e) => {
      if (!col.contains(e.relatedTarget as Node | null)) col.classList.remove('coluna--sobre');
    });
    col.addEventListener('drop', (e) => {
      e.preventDefault();
      const item = arrastando;
      arrastando = null;
      limpar();
      if (!item || item.origem === destino) return;
      if (destino === 'resolvido') pedirSolucao(item.protocolo);
      else mover(item.protocolo, destino);
    });
  });
}

function mover(protocolo: string, destino: StatusChamado, solucao = ''): string | null {
  const erro = moverChamado(protocolo, destino, solucao);
  if (!erro) {
    avisar(`${protocolo} movido para ${STATUS_LABEL[destino]}.`);
    recarregar();
  }
  return erro;
}

function pedirSolucao(protocolo: string): void {
  const c = obterChamado(protocolo);
  abrirModal({
    titulo: `Resolver ${protocolo}`,
    corpo: html`
      <p class="mudo" style="margin-bottom:12px">${c?.titulo ?? ''}</p>
      ${campoTexto({ nome: 'solucao', rotulo: 'Solução aplicada', limite: LIMITE.solucao_aplicada, placeholder: 'Obrigatória para marcar como resolvido' })}`,
    confirmar: 'Marcar como resolvido',
    aoConfirmar: (form) => {
      const solucao = (form.elements.namedItem('solucao') as HTMLInputElement).value.trim();
      return mover(protocolo, 'resolvido', solucao);
    },
  });
}

export function paginaFila({ usuario, query }: Contexto): Pagina {
  const f = {
    q: query.get('q') ?? '',
    prioridade: query.get('prioridade') ?? '',
    solicitante: query.get('solicitante') ?? '',
    equipamento: query.get('equipamento') ?? '',
    responsavel: query.get('responsavel') ?? '',
    local: query.get('local') ?? '',
    periodo: query.get('periodo') ?? '30',
    ordem: query.get('ordem') ?? 'recentes',
  };
  const limite = Date.now() - Number(f.periodo) * 864e5;
  const todos = listarChamados();

  const lista = todos
    .filter((c) => !f.q || normalizar(`${c.protocolo} ${c.titulo} ${nomeLocal(c.localId)} ${nomeUsuario(c.solicitanteId)}`).includes(normalizar(f.q)))
    .filter((c) => !f.prioridade || c.prioridade === f.prioridade)
    .filter((c) => !f.solicitante || c.solicitanteId === Number(f.solicitante))
    .filter((c) => !f.equipamento || c.equipamentoId === Number(f.equipamento))
    .filter((c) => !f.local || c.localId === Number(f.local))
    .filter((c) => (f.responsavel === 'eu' ? c.responsavelId === usuario.id : f.responsavel === 'nenhum' ? !c.responsavelId : true))
    // O período só esconde chamados já encerrados; os em aberto aparecem sempre.
    .filter((c) => c.status === 'aberto' || c.status === 'em_andamento' || new Date(c.atualizadoEm).getTime() >= limite)
    .sort((a, b) => (f.ordem === 'prioridade' ? PESO[a.prioridade] - PESO[b.prioridade] : 0) || b.criadoEm.localeCompare(a.criadoEm));

  const solicitantes = [...new Set(todos.map((c) => c.solicitanteId))];
  const usuarios = listarUsuarios().filter((u) => solicitantes.includes(u.id));
  const comChamado = new Set(todos.map((c) => c.equipamentoId).filter(Boolean));
  const aparelhos = listarEquipamentos().filter((e) => comChamado.has(e.id));
  const podeArrastar = pode('registrar_atendimento', usuario);
  const temFiltro = f.q || f.prioridade || f.solicitante || f.equipamento || f.responsavel || f.local;

  const conteudo = html`
    <div class="pagina" style="max-width:none">
      ${cabecalho(
        'Fila de chamados',
        `${todos.filter((c) => c.status === 'aberto').length} abertos · ${todos.filter((c) => c.status === 'aberto' && !c.responsavelId).length} sem responsável`,
        html`
          <form class="busca" role="search" data-busca style="max-width:280px">
            ${icone('busca')}
            <label class="sr-only" for="q">Buscar chamado</label>
            <input id="q" name="q" value="${f.q}" placeholder="Buscar chamado" />
          </form>`,
      )}
      <form class="barra-filtros" data-filtros aria-label="Filtros da fila">
        ${seletor('prioridade', 'Prioridade', f.prioridade, [['', 'Todas'], ...Object.entries(PRIORIDADE_LABEL)])}
        ${seletor('solicitante', 'Solicitante', f.solicitante, [['', 'Todos'], ...usuarios.map((u): [number, string] => [u.id, u.nome])])}
        ${seletor('responsavel', 'Responsável', f.responsavel, [['', 'Todos'], ['eu', 'Comigo'], ['nenhum', 'Sem responsável']])}
        ${seletor('local', 'Local', f.local, [['', 'Todos'], ...listarLocais(true).map((l): [number, string] => [l.id, l.nome])])}
        ${seletor('equipamento', 'Aparelho', f.equipamento, [['', 'Todos'], ...aparelhos.map((e): [number, string] => [e.id, `${e.tipo} · ${e.patrimonio}`])])}
        ${seletor('periodo', 'Período', f.periodo, [['7', '7 dias'], ['30', '30 dias'], ['180', 'Semestre']])}
        ${seletor('ordem', 'Ordenar', f.ordem, [['recentes', 'Mais recentes'], ['prioridade', 'Prioridade']])}
        ${temFiltro ? html`<a class="link" href="#/fila" style="font-size:13px">Limpar filtros</a>` : ''}
      </form>
      ${lista.length
        ? html`
            <div class="quadro">
              ${STATUS_ORDEM.map((s) => {
                const daColuna = lista.filter((c) => c.status === s);
                return html`
                  <section class="coluna coluna--${s}" data-status="${s}" aria-label="${STATUS_LABEL[s]}">
                    <h2><span>${STATUS_LABEL[s]}</span><span>${daColuna.length}</span></h2>
                    ${daColuna.length ? daColuna.map((c) => tiquete(c, podeArrastar)) : html`<p class="coluna__vazia">Nenhum chamado</p>`}
                  </section>`;
              })}
            </div>`
        : html`<section class="card">${vazio('Nenhum chamado encontrado', 'Não há chamados para os filtros escolhidos.', html`<a class="btn btn--contorno" href="#/fila">Limpar filtros</a>`)}</section>`}
    </div>`;

  return {
    titulo: 'Fila de chamados',
    html: conteudo,
    montar(raiz) {
      const aplicar = () => {
        const p = new URLSearchParams();
        const q = qs<HTMLInputElement>(raiz, '#q').value.trim();
        if (q) p.set('q', q);
        qsa<HTMLSelectElement>(raiz, '[data-filtros] select').forEach((s) => {
          if (s.value && !(s.name === 'periodo' && s.value === '30') && !(s.name === 'ordem' && s.value === 'recentes')) p.set(s.name, s.value);
        });
        location.hash = `#/fila${p.toString() ? `?${p}` : ''}`;
      };
      qsa(raiz, '[data-filtros] select').forEach((s) => s.addEventListener('change', aplicar));
      qs(raiz, '[data-busca]').addEventListener('submit', (e) => {
        e.preventDefault();
        aplicar();
      });
      if (podeArrastar) ligarArrastar(raiz);
    },
  };
}
