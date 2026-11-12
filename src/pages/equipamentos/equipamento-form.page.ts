/**
 * Telas 10, 44 e 34 · Cadastrar / editar equipamento (RF10, RF12–RF14):
 * inativação mostra o impacto e exclusão é bloqueada se houver chamados.
 */
import { html, lerFormulario, mostrarErros, qs } from '@/core/dom';
import { SITUACAO_LABEL } from '@/core/labels';
import type { SituacaoEquipamento } from '@/core/types';
import { LIMITE } from '@/data/limites';
import type { Contexto, Pagina } from '@/app/router';
import { navegar } from '@/app/router';
import { campoSelect, campoTexto, ligarContadores } from '@/components/campos';
import { icone } from '@/components/icones';
import { abrirModal, avisar } from '@/components/feedback';
import { cabecalho } from '@/components/selos';
import { pode } from '@/services/permissoes.service';
import {
  atualizarEquipamento,
  chamadosDoEquipamento,
  criarEquipamento,
  descreverEquipamento,
  excluirEquipamento,
  listarTipos,
  obterEquipamento,
  validarEquipamento,
  type DadosEquipamento,
} from '@/services/equipamentos.service';
import { listarLocais } from '@/services/locais.service';

export function paginaFormEquipamento({ params, query }: Contexto): Pagina {
  const eq = params.id ? obterEquipamento(Number(params.id)) : undefined;
  const localInicial = eq?.localId ?? (Number(query.get('local')) || '');
  const locais = listarLocais(Boolean(eq)); // inativos só aparecem se o aparelho já estiver em um
  const situacoes = (Object.keys(SITUACAO_LABEL) as SituacaoEquipamento[]).filter((s) => s !== 'inativo' || pode('inativar_cadastros') || eq?.situacao === 'inativo');

  const conteudo = html`
    <div class="pagina" style="max-width:720px">
      <a class="voltar" href="#/equipamentos">${icone('voltar')} Voltar a Equipamentos</a>
      ${cabecalho(eq ? `Editar ${eq.patrimonio || descreverEquipamento(eq)}` : 'Novo equipamento', 'Aparelhos ativos aparecem na abertura de chamados do local.')}
      <form class="card form" novalidate>
        <div class="grade-campos">
          ${campoTexto({ nome: 'patrimonio', rotulo: 'Identificação patrimonial', valor: eq?.patrimonio, limite: LIMITE.identificacao_patrimonial, placeholder: 'PAT-00000' })}
          ${campoTexto({ nome: 'codigoInterno', rotulo: 'Código interno', valor: eq?.codigoInterno, modo: 'numeric', placeholder: 'Só números', ajuda: 'Use se não houver patrimônio.' })}
          ${campoSelect({ nome: 'tipoId', rotulo: 'Tipo', valor: eq?.tipoId, vazio: 'Selecione', opcoes: listarTipos().map((t) => [t.id, t.nome]) })}
          ${campoSelect({ nome: 'localId', rotulo: 'Local', valor: localInicial, vazio: 'Selecione', opcoes: locais.map((l) => [l.id, l.ativo ? l.nome : `${l.nome} (inativo)`]) })}
          ${campoTexto({ nome: 'marca', rotulo: 'Marca', valor: eq?.marca, limite: LIMITE.marca, placeholder: 'Ex.: Epson' })}
          ${campoTexto({ nome: 'modelo', rotulo: 'Modelo', valor: eq?.modelo, limite: LIMITE.modelo, placeholder: 'Ex.: PowerLite X49' })}
          ${campoTexto({ nome: 'serie', rotulo: 'Nº de série', valor: eq?.serie, limite: LIMITE.numero_serie, placeholder: 'Ex.: X4K9-22831' })}
          ${campoSelect({ nome: 'situacao', rotulo: 'Situação', valor: eq?.situacao ?? 'operacional', opcoes: situacoes.map((s) => [s, SITUACAO_LABEL[s]]) })}
        </div>
        <div class="acoes-form">
          ${eq && pode('excluir_cadastros') ? html`<button type="button" class="btn btn--tracejado" data-excluir>Excluir equipamento</button>` : ''}
          <a class="btn btn--contorno" href="#/equipamentos">Cancelar</a>
          <button class="btn btn--escuro" type="submit">Salvar equipamento</button>
        </div>
      </form>
    </div>`;

  return {
    titulo: eq ? 'Editar equipamento' : 'Novo equipamento',
    html: conteudo,
    montar(raiz) {
      const form = qs<HTMLFormElement>(raiz, 'form');
      ligarContadores(raiz);
      const salvar = (d: DadosEquipamento) => {
        if (eq) atualizarEquipamento(eq.id, d);
        else criarEquipamento(d);
        avisar(eq ? 'Equipamento atualizado.' : 'Equipamento cadastrado.');
        navegar(`/locais?local=${d.localId}`);
      };
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const d = lerFormulario(form) as unknown as DadosEquipamento;
        if (!mostrarErros(form, validarEquipamento(d, eq?.id))) return;
        // UC13: antes de inativar, mostra o impacto.
        if (eq && eq.situacao !== 'inativo' && d.situacao === 'inativo') {
          abrirModal({
            titulo: `Inativar ${eq.patrimonio || descreverEquipamento(eq)}?`,
            corpo: html`<p>O aparelho deixa de aparecer na abertura de chamados. Os ${chamadosDoEquipamento(eq.id)} chamado(s) ligados a ele continuam no histórico.</p>`,
            confirmar: 'Inativar',
            perigo: true,
            aoConfirmar: () => salvar(d),
          });
          return;
        }
        salvar(d);
      });

      raiz.querySelector('[data-excluir]')?.addEventListener('click', () => {
        if (!eq) return;
        const n = chamadosDoEquipamento(eq.id);
        if (n > 0) {
          abrirModal({
            titulo: 'Não é possível excluir',
            corpo: html`
              <p>${descreverEquipamento(eq)} · ${eq.patrimonio} tem ${n} chamado(s) vinculado(s). Para manter o histórico, ele não pode ser excluído.</p>
              <p>Se o aparelho saiu de uso, mude a situação para <strong>Inativo</strong>.</p>`,
            confirmar: 'Entendi',
            cancelar: '',
          });
          return;
        }
        abrirModal({
          titulo: `Excluir ${eq.patrimonio}?`,
          corpo: html`<p>O equipamento não tem chamados e será removido definitivamente. A ação fica registrada na auditoria.</p>`,
          confirmar: 'Excluir',
          perigo: true,
          aoConfirmar() {
            excluirEquipamento(eq.id);
            avisar('Equipamento excluído.');
            navegar('/equipamentos');
          },
        });
      });
    },
  };
}
