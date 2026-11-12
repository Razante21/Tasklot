/**
 * Telas 03, 04 e 20 · Novo chamado (RF02 / UC02) com reaproveitamento
 * de chamados anteriores (RF03 / UC03) e tela de chamado enviado.
 */
import { html, lerFormulario, mostrarErros, qs, type Seguro } from '@/core/dom';
import { PRIORIDADE_DESCRICAO, PRIORIDADE_LABEL } from '@/core/labels';
import type { Chamado, Prioridade } from '@/core/types';
import { LIMITE } from '@/data/limites';
import type { Contexto, Pagina } from '@/app/router';
import { navegar } from '@/app/router';
import { campoArea, campoSelect, campoTexto, ligarContadores } from '@/components/campos';
import { cabecalho, seloStatus } from '@/components/selos';
import {
  abrirChamado,
  chamadosDoSolicitante,
  chamadosParecidos,
  obterChamado,
  ultimaSolucao,
  validarNovoChamado,
  type DadosNovoChamado,
} from '@/services/chamados.service';
import { equipamentosDoLocal } from '@/services/equipamentos.service';
import { listarLocais, nomeLocal } from '@/services/locais.service';
import { pode } from '@/services/permissoes.service';

function opcoesEquipamento(idLocal: number | null): [number, string][] {
  return idLocal ? equipamentosDoLocal(idLocal, false).map((e) => [e.id, `${e.tipo} ${e.marca} · ${e.patrimonio}`]) : [];
}

function painelParecidos(lista: Chamado[], idLocal: number | null): Seguro {
  if (!idLocal) return html`<p class="mudo" style="font-size:13px">Escolha o local para ver chamados anteriores do mesmo lugar.</p>`;
  if (!lista.length) return html`<p class="mudo" style="font-size:13px">Nenhum chamado encerrado em ${nomeLocal(idLocal)} com esses dados. Pode seguir.</p>`;
  return html`
    <p class="card__sub" style="margin-top:-6px">Chamados anteriores em ${nomeLocal(idLocal)}. Reaproveite a solução ou os dados.</p>
    ${lista.map(
      (c) => html`
        <div class="parecido">
          <span class="parecido__topo">${c.titulo} ${seloStatus(c.status)}</span>
          <small>${c.protocolo} · Solução: ${ultimaSolucao(c)?.solucao || '—'}</small>
          <button type="button" class="link" data-reutilizar="${c.protocolo}" style="font-size:12.5px;margin-top:6px">Reutilizar dados</button>
        </div>`,
    )}`;
}

export function paginaNovoChamado({ usuario, query }: Contexto): Pagina {
  const locais = listarLocais();
  // UC03: "Reutilizar" vindo de um chamado anterior (?de=T-0121). FS001: só chamados que a pessoa pode ver.
  const base = query.get('de') ? obterChamado(query.get('de')!) : undefined;
  const podeReutilizar = base && (base.solicitanteId === usuario.id || pode('ver_fila'));
  const origem = podeReutilizar ? base : undefined;
  const localInicial = origem && locais.some((l) => l.id === origem.localId) ? origem.localId : null;

  const conteudo = html`
    <div class="pagina">
      ${cabecalho('Novo chamado', 'Descreva o problema para a equipe de suporte.')}
      ${origem ? html`<p class="aviso aviso--ok">Dados reaproveitados do ${origem.protocolo}. Revise e complete antes de enviar; o chamado original não muda.</p>` : ''}
      ${base && !podeReutilizar ? html`<p class="aviso aviso--erro">Você não tem acesso ao chamado ${query.get('de')} para reutilizar.</p>` : ''}
      <div class="duas-colunas">
        <form class="card form" novalidate>
          <div class="campo">
            <span class="rotulo">Solicitante</span>
            <p style="font-weight:600">${usuario.nome} <span class="mudo" style="font-weight:400">· ${usuario.perfilNome}</span></p>
          </div>
          ${campoTexto({ nome: 'titulo', rotulo: 'Título', valor: origem?.titulo, limite: LIMITE.titulo, placeholder: 'Ex.: Projetor não liga' })}
          <div class="grade-campos">
            ${campoSelect({ nome: 'localId', rotulo: 'Local', valor: localInicial, vazio: 'Selecione', opcoes: locais.map((l) => [l.id, `${l.nome} · Bloco ${l.bloco}`]) })}
            ${campoSelect({
              nome: 'equipamentoId', rotulo: 'Aparelho', valor: origem?.equipamentoId, vazio: localInicial ? 'Nenhum aparelho específico' : 'Escolha o local primeiro',
              opcoes: opcoesEquipamento(localInicial), desativado: !localInicial,
            })}
          </div>
          ${campoSelect({
            nome: 'prioridade', rotulo: 'Prioridade', valor: origem?.prioridade ?? 'media',
            opcoes: (Object.keys(PRIORIDADE_LABEL) as Prioridade[]).map((p) => [p, `${PRIORIDADE_LABEL[p]} — ${PRIORIDADE_DESCRICAO[p]}`]),
          })}
          ${campoArea({ nome: 'descricao', rotulo: 'Descrição', valor: origem?.descricao, limite: LIMITE.descricao_chamado, placeholder: 'O que aconteceu? Desde quando? O que você já tentou?' })}
          <div class="acoes-form">
            <a class="btn btn--contorno" href="#/chamados">Cancelar</a>
            <button class="btn btn--marca" type="submit">Enviar chamado</button>
          </div>
        </form>

        <aside class="pilha">
          <section class="card" aria-live="polite">
            <h2>Já aconteceu por aqui?</h2>
            <div data-parecidos>${painelParecidos(chamadosParecidos(localInicial, origem?.equipamentoId ?? null), localInicial)}</div>
          </section>
          ${(() => {
            const meus = chamadosDoSolicitante(usuario.id).filter((c) => c.status === 'fechado' || c.status === 'resolvido').slice(0, 3);
            return meus.length
              ? html`<section class="card"><h2>Seus chamados encerrados</h2>
                  ${meus.map((c) => html`<div class="parecido"><span class="parecido__topo">${c.titulo}</span><small>${c.protocolo} · ${nomeLocal(c.localId)}</small>
                    <button type="button" class="link" data-reutilizar="${c.protocolo}" style="font-size:12.5px;margin-top:6px">Reutilizar dados</button></div>`)}
                </section>`
              : html``;
          })()}
        </aside>
      </div>
    </div>`;

  return {
    titulo: 'Novo chamado',
    html: conteudo,
    montar(raiz) {
      const form = qs<HTMLFormElement>(raiz, 'form');
      const local = qs<HTMLSelectElement>(form, '#localId');
      const equip = qs<HTMLSelectElement>(form, '#equipamentoId');
      const painel = qs(raiz, '[data-parecidos]');
      ligarContadores(raiz);

      const atualizarParecidos = () => {
        const id = Number(local.value) || null;
        painel.innerHTML = painelParecidos(chamadosParecidos(id, Number(equip.value) || null), id).valor;
      };
      local.addEventListener('change', () => {
        const id = Number(local.value) || null;
        equip.disabled = !id;
        equip.innerHTML = html`
          <option value="">${id ? 'Nenhum aparelho específico' : 'Escolha o local primeiro'}</option>
          ${opcoesEquipamento(id).map(([v, t]) => html`<option value="${v}">${t}</option>`)}`.valor;
        atualizarParecidos();
      });
      equip.addEventListener('change', atualizarParecidos);

      // UC03: reaproveita os dados num NOVO chamado, sem mexer no original.
      raiz.addEventListener('click', (e) => {
        const b = (e.target as HTMLElement).closest<HTMLElement>('[data-reutilizar]');
        if (b) navegar(`/chamados/novo?de=${b.dataset.reutilizar}`);
      });

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const d = lerFormulario(form) as unknown as DadosNovoChamado;
        d.equipamentoId = d.equipamentoId ?? '';
        if (!mostrarErros(form, validarNovoChamado(d))) return;
        const c = abrirChamado(d);
        navegar(`/chamados/${c.protocolo}/enviado`);
      });
    },
  };
}

/** Tela 04 · Chamado enviado (UC02: mostra número e status inicial). */
export function paginaChamadoEnviado({ params }: Contexto): Pagina {
  const c = obterChamado(params.id);
  return {
    titulo: 'Chamado enviado',
    html: html`
      <div class="pagina" style="max-width:640px">
        <section class="card" style="text-align:center;padding:40px 28px">
          <img src="/logo.svg" alt="" style="width:64px;height:64px;margin:0 auto 18px" />
          <h1>Chamado enviado!</h1>
          ${c
            ? html`<p style="margin:14px 0 6px"><strong class="titulo-fonte" style="font-size:20px">${c.protocolo}</strong></p>
                <p style="margin-bottom:10px">${seloStatus(c.status)}</p>
                <p class="mudo" style="margin:0 auto;max-width:42ch">${c.titulo} chegou para a Equipe de TI. Você recebe um aviso aqui quando houver novidade.</p>`
            : html`<p class="mudo">Seu chamado foi registrado.</p>`}
          <div class="cabecalho__acoes" style="justify-content:center;margin-top:24px">
            ${c ? html`<a class="btn btn--escuro" href="#/chamados/${c.protocolo}">Acompanhar chamado</a>` : ''}
            <a class="btn btn--contorno" href="#/chamados">Voltar a Meus chamados</a>
          </div>
        </section>
      </div>`,
  };
}
