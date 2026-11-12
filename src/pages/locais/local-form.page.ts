/** Tela 10 · Cadastrar / editar local (RF07, RF12–RF14 / UC07, UC12–UC14). */
import { html, lerFormulario, mostrarErros, qs } from '@/core/dom';
import { LIMITE } from '@/data/limites';
import type { Contexto, Pagina } from '@/app/router';
import { navegar } from '@/app/router';
import { campoArea, campoTexto, ligarContadores } from '@/components/campos';
import { icone } from '@/components/icones';
import { abrirModal, avisar } from '@/components/feedback';
import { cabecalho } from '@/components/selos';
import { pode } from '@/services/permissoes.service';
import {
  atualizarLocal,
  criarLocal,
  definirSituacaoLocal,
  excluirLocal,
  obterLocal,
  validarLocal,
  vinculosLocal,
  type DadosLocal,
} from '@/services/locais.service';

export function paginaFormLocal({ params }: Contexto): Pagina {
  const local = params.id ? obterLocal(Number(params.id)) : undefined;

  const conteudo = html`
    <div class="pagina" style="max-width:720px">
      <a class="voltar" href="#/locais${local ? `?local=${local.id}` : ''}">${icone('voltar')} Voltar a Locais e equipamentos</a>
      ${cabecalho(local ? `Editar ${local.nome}` : 'Novo local', 'Locais ativos aparecem na abertura de chamados.')}
      <form class="card form" novalidate>
        ${campoTexto({ nome: 'nome', rotulo: 'Nome do local', valor: local?.nome, limite: LIMITE.local_nome, placeholder: 'Ex.: Lab 05' })}
        <div class="grade-campos">
          ${campoTexto({ nome: 'bloco', rotulo: 'Bloco', valor: local?.bloco, limite: LIMITE.local_bloco, placeholder: 'Ex.: A' })}
          ${campoTexto({ nome: 'sala', rotulo: 'Sala', valor: local?.sala, limite: LIMITE.local_sala, placeholder: 'Ex.: 05' })}
        </div>
        ${campoArea({ nome: 'descricao', rotulo: 'Descrição', valor: local?.descricao, limite: LIMITE.local_descricao, placeholder: 'Ex.: Laboratório de informática · térreo · 40 lugares', altura: 70 })}
        ${local ? html`<p class="mudo" style="font-size:13px">Situação: <strong>${local.ativo ? 'Ativo' : 'Inativo'}</strong></p>` : ''}
        <div class="acoes-form">
          ${local && pode('inativar_cadastros') ? html`<button type="button" class="btn btn--tracejado" data-situacao>${local.ativo ? 'Inativar local' : 'Reativar local'}</button>` : ''}
          ${local && pode('excluir_cadastros') ? html`<button type="button" class="btn btn--contorno" data-excluir>Excluir</button>` : ''}
          <a class="btn btn--contorno" href="#/locais">Cancelar</a>
          <button class="btn btn--escuro" type="submit">Salvar local</button>
        </div>
      </form>
    </div>`;

  return {
    titulo: local ? 'Editar local' : 'Novo local',
    html: conteudo,
    montar(raiz) {
      const form = qs<HTMLFormElement>(raiz, 'form');
      ligarContadores(raiz);
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const d = lerFormulario(form) as unknown as DadosLocal;
        if (!mostrarErros(form, validarLocal(d, local?.id))) return;
        const id = local ? (atualizarLocal(local.id, d), local.id) : criarLocal(d).id;
        avisar(local ? 'Local atualizado.' : 'Local cadastrado.');
        navegar(`/locais?local=${id}`);
      });

      raiz.querySelector('[data-situacao]')?.addEventListener('click', () => {
        if (!local) return;
        const v = vinculosLocal(local.id);
        abrirModal({
          titulo: local.ativo ? `Inativar ${local.nome}?` : `Reativar ${local.nome}?`,
          corpo: local.ativo
            ? html`<p>O local deixa de aparecer na abertura de chamados. Os ${v.chamados} chamado(s) e ${v.equipamentos} registro(s) de equipamento ligados a ele continuam no histórico.</p>`
            : html`<p>O local volta a aparecer na abertura de chamados.</p>`,
          confirmar: local.ativo ? 'Inativar' : 'Reativar',
          perigo: local.ativo,
          aoConfirmar() {
            const erro = definirSituacaoLocal(local.id, !local.ativo);
            if (erro) return erro;
            avisar(local.ativo ? 'Local inativado.' : 'Local reativado.');
            navegar(`/locais?local=${local.id}`);
            return null;
          },
        });
      });

      raiz.querySelector('[data-excluir]')?.addEventListener('click', () => {
        if (!local) return;
        const v = vinculosLocal(local.id);
        if (v.equipamentos || v.chamados) {
          // UC07 · FS002 / UC14 · FS001: impede e orienta a inativação.
          abrirModal({
            titulo: 'Não é possível excluir',
            corpo: html`<p>${local.nome} tem ${v.equipamentos} registro(s) de equipamento e ${v.chamados} chamado(s) vinculados. Para não perder o histórico, use <strong>Inativar local</strong>.</p>`,
            confirmar: 'Entendi',
            cancelar: '',
          });
          return;
        }
        abrirModal({
          titulo: `Excluir ${local.nome}?`,
          corpo: html`<p>O local não tem vínculos e será removido definitivamente. A ação fica registrada na auditoria.</p>`,
          confirmar: 'Excluir',
          perigo: true,
          aoConfirmar() {
            excluirLocal(local.id);
            avisar('Local excluído.');
            navegar('/locais');
          },
        });
      });
    },
  };
}
