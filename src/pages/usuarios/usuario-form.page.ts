/**
 * Telas 30, 30b, 31 e 33 · Cadastrar / editar usuário (RF09, RF12–RF14 / UC09, UC12–UC14).
 */
import { html, lerFormulario, mostrarErros, qs, type Seguro } from '@/core/dom';
import { FORMAS_CONTATO, GRUPOS_PERMISSAO } from '@/core/labels';
import { LIMITE } from '@/data/limites';
import { SENHA_INICIAL } from '@/data/seed';
import type { Contexto, Pagina } from '@/app/router';
import { navegar } from '@/app/router';
import { campoSelect, campoTexto, ligarContadores } from '@/components/campos';
import { icone } from '@/components/icones';
import { abrirModal, avisar } from '@/components/feedback';
import { cabecalho } from '@/components/selos';
import { listarPerfis, nomePerfil, permissoesDoPerfil, pode } from '@/services/permissoes.service';
import {
  atualizarUsuario,
  criarUsuario,
  excluirUsuario,
  obterUsuario,
  validarUsuario,
  vinculosUsuario,
  type DadosUsuario,
} from '@/services/usuarios.service';

/** O que o perfil pode fazer, lido da tabela Perfil_Permissao_autoriza. */
function painelPerfil(idPerfil: number): Seguro {
  const m = permissoesDoPerfil(idPerfil);
  const itens = GRUPOS_PERMISSAO.flatMap((g) => g.itens).filter((i) => m[i.chave]);
  return itens.length
    ? html`<ul class="lista-check">${itens.map((i) => html`<li>${i.label}</li>`)}</ul>
        <p class="mudo" style="font-size:12px;margin-top:14px">As permissões de cada perfil são definidas em Permissões.</p>`
    : html`<p class="mudo" style="font-size:13px">Este perfil ainda não tem permissões. Configure em Permissões.</p>`;
}

export function paginaFormUsuario({ params, usuario: eu }: Contexto): Pagina {
  const u = params.id ? obterUsuario(Number(params.id)) : undefined;
  const perfis = listarPerfis().filter((p) => p.ativo || p.id === u?.perfilId);
  const perfilInicial = u?.perfilId ?? perfis[0]?.id;
  const ativo = u?.ativo ?? true;
  const euMesmo = u?.id === eu.id;

  const conteudo = html`
    <div class="pagina">
      <a class="voltar" href="#/usuarios">${icone('voltar')} Voltar a Usuários</a>
      ${cabecalho(u ? `Editar ${u.nome}` : 'Novo usuário', u ? 'Altere os dados, o perfil ou a situação do acesso.' : 'Preencha os dados para liberar o acesso.')}
      <div class="duas-colunas">
        <form class="card form" novalidate>
          <h2 style="margin-bottom:0">Dados do usuário</h2>
          ${campoTexto({ nome: 'nome', rotulo: 'Nome completo', valor: u?.nome, limite: LIMITE.nome_completo })}
          <div class="grade-campos">
            ${campoTexto({ nome: 'email', rotulo: 'E-mail institucional', valor: u?.email, limite: LIMITE.email_institucional, placeholder: 'nome@fatec.sp.gov.br', ajuda: 'É o login do sistema.' })}
            ${campoTexto({ nome: 'identificacao', rotulo: 'Identificação (matrícula)', valor: u?.identificacao, modo: 'numeric', placeholder: 'Só números' })}
            ${campoSelect({ nome: 'formaContato', rotulo: 'Forma de contato', valor: u?.formaContato ?? 'Ramal', opcoes: FORMAS_CONTATO.map((f) => [f, f]) })}
            ${campoTexto({ nome: 'contato', rotulo: 'Contato principal', valor: u?.contato, limite: LIMITE.contato_principal, placeholder: 'Ex.: 220' })}
          </div>
          ${campoSelect({
            nome: 'perfilId', rotulo: 'Perfil de acesso', valor: perfilInicial, desativado: euMesmo,
            opcoes: perfis.map((p) => [p.id, p.nome]), ajuda: euMesmo ? 'Você não pode mudar o próprio perfil.' : undefined,
          })}
          <fieldset class="campo" style="border:0;padding:0;margin:0">
            <legend style="font-size:13px;font-weight:600;margin-bottom:6px">Situação</legend>
            <div class="alternador">
              <input type="radio" id="ativo-sim" name="ativo" value="sim" ${ativo ? html`checked` : ''} />
              <label for="ativo-sim">Ativo</label>
              <input type="radio" id="ativo-nao" name="ativo" value="nao" ${!ativo ? html`checked` : ''} ${euMesmo || !pode('inativar_cadastros') ? html`disabled` : ''} />
              <label for="ativo-nao">Inativo</label>
            </div>
            ${u?.dataInativacao ? html`<small class="mudo">Inativado em ${u.dataInativacao.split('-').reverse().join('/')}.</small>` : ''}
          </fieldset>
          ${u ? '' : html`<small class="mudo">A senha inicial é "${SENHA_INICIAL}". Peça para a pessoa trocar no primeiro acesso.</small>`}
          <div class="acoes-form">
            ${u && !euMesmo && pode('excluir_cadastros') ? html`<button type="button" class="btn btn--tracejado" data-excluir>Excluir usuário</button>` : ''}
            <a class="btn btn--contorno" href="#/usuarios">Cancelar</a>
            <button class="btn btn--marca" type="submit">${u ? 'Salvar alterações' : 'Cadastrar usuário'}</button>
          </div>
        </form>
        <aside class="card" aria-live="polite">
          <h2 data-titulo-perfil>O que o perfil ${nomePerfil(perfilInicial)} pode fazer</h2>
          <div data-painel-perfil>${painelPerfil(perfilInicial)}</div>
        </aside>
      </div>
    </div>`;

  return {
    titulo: u ? 'Editar usuário' : 'Novo usuário',
    html: conteudo,
    montar(raiz) {
      const form = qs<HTMLFormElement>(raiz, 'form');
      ligarContadores(raiz);
      const selPerfil = qs<HTMLSelectElement>(form, '#perfilId');
      selPerfil.addEventListener('change', () => {
        const id = Number(selPerfil.value);
        qs(raiz, '[data-titulo-perfil]').textContent = `O que o perfil ${nomePerfil(id)} pode fazer`;
        qs(raiz, '[data-painel-perfil]').innerHTML = painelPerfil(id).valor;
      });

      const salvar = (d: DadosUsuario) => {
        if (u) atualizarUsuario(u.id, d);
        else criarUsuario(d);
        avisar(u ? 'Usuário atualizado.' : 'Usuário cadastrado.');
        navegar('/usuarios');
      };

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const b = lerFormulario(form);
        const d: DadosUsuario = {
          nome: b.nome,
          email: b.email,
          identificacao: b.identificacao,
          formaContato: b.formaContato,
          contato: b.contato,
          perfilId: b.perfilId ?? String(u?.perfilId ?? ''),
          ativo: b.ativo !== 'nao',
        };
        if (!mostrarErros(form, validarUsuario(d, u?.id))) return;
        // UC13: antes de inativar, mostra o impacto.
        if (u && u.ativo && !d.ativo) {
          abrirModal({
            titulo: `Inativar ${u.nome}?`,
            corpo: html`<p>A pessoa não vai mais conseguir entrar e sai das opções de novos chamados. Os chamados dela continuam no histórico, e você pode reativar depois.</p>`,
            confirmar: 'Inativar usuário',
            perigo: true,
            aoConfirmar: () => salvar(d),
          });
          return;
        }
        salvar(d);
      });

      raiz.querySelector('[data-excluir]')?.addEventListener('click', () => {
        if (!u) return;
        const v = vinculosUsuario(u.id);
        if (v.chamados || v.eventos) {
          abrirModal({
            titulo: 'Não é possível excluir',
            corpo: html`<p>${u.nome} tem ${v.chamados} chamado(s) e ${v.eventos} registro(s) de histórico ligados. Para não perder o histórico, use a situação <strong>Inativo</strong>.</p>`,
            confirmar: 'Entendi',
            cancelar: '',
          });
          return;
        }
        abrirModal({
          titulo: `Excluir ${u.nome}?`,
          corpo: html`<p>O usuário não tem chamados nem registros e será removido definitivamente, junto com a credencial. A ação fica na auditoria.</p>`,
          confirmar: 'Excluir',
          perigo: true,
          aoConfirmar() {
            excluirUsuario(u.id);
            avisar('Usuário excluído.');
            navegar('/usuarios');
          },
        });
      });
    },
  };
}
