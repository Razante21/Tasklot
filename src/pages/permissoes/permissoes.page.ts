/**
 * Telas 35 e 48 · Perfis e permissões (RF15 / UC15):
 * matriz da tabela Perfil_Permissao_autoriza, novo perfil, regra inválida (FS001)
 * e confirmação quando o perfil já tem usuários (FS002).
 */
import { html, lerFormulario, qs, qsa } from '@/core/dom';
import { GRUPOS_PERMISSAO } from '@/core/labels';
import type { MatrizPermissoes, Permissao } from '@/core/types';
import { LIMITE } from '@/data/limites';
import type { Contexto, Pagina } from '@/app/router';
import { navegar } from '@/app/router';
import { icone } from '@/components/icones';
import { abrirModal, avisar } from '@/components/feedback';
import { cabecalho } from '@/components/selos';
import { criarPerfil, eFixa, listarPerfis, matrizAtual, perfisEmUsoAlterados, salvarMatriz, validarMatriz } from '@/services/permissoes.service';

export function paginaPermissoes(_: Contexto): Pagina {
  const perfis = listarPerfis();
  const m = matrizAtual();

  const conteudo = html`
    <div class="pagina" style="max-width:none">
      ${cabecalho(
        'Perfis e permissões',
        'Defina o que cada perfil pode fazer no Tasklot.',
        html`
          <button type="button" class="btn btn--contorno" data-novo>${icone('mais')} Novo perfil</button>
          <button type="button" class="btn btn--marca" data-salvar>Salvar permissões</button>`,
      )}
      <p class="aviso" data-problemas role="alert"></p>
      <section class="card card--sem-padding">
        <div class="tabela-wrap">
          <table class="tabela tabela-permissoes">
            <thead>
              <tr><th>Função</th>${perfis.map((p) => html`<th title="${p.descricao}">${p.nome}</th>`)}</tr>
            </thead>
            <tbody>
              ${GRUPOS_PERMISSAO.map(
                (g) => html`
                  <tr class="grupo"><td colspan="${perfis.length + 1}">${g.titulo}</td></tr>
                  ${g.itens.map(
                    (i) => html`
                      <tr>
                        <td>${i.label}${i.dica ? html`<span class="sub" style="font-size:11.5px;color:var(--texto-3)">${i.dica}</span>` : ''}</td>
                        ${perfis.map(
                          (p) => html`
                            <td>
                              <input type="checkbox" data-perfil="${p.id}" data-perm="${i.chave}" aria-label="${i.label} · ${p.nome}"
                                ${m[p.id][i.chave] ? html`checked` : ''} ${eFixa(p.id, i.chave) ? html`disabled` : ''} />
                            </td>`,
                        )}
                      </tr>`,
                  )}`,
              )}
            </tbody>
          </table>
        </div>
      </section>
      <p class="mudo" style="font-size:13px">As mudanças valem no próximo clique de cada usuário. Caixas apagadas são fixas do perfil. Toda alteração fica na auditoria.</p>
    </div>`;

  return {
    titulo: 'Permissões',
    html: conteudo,
    montar(raiz) {
      const caixa = qs(raiz, '[data-problemas]');
      const ler = (): MatrizPermissoes => {
        const nova = matrizAtual();
        qsa<HTMLInputElement>(raiz, 'input[data-perm]').forEach((c) => {
          nova[Number(c.dataset.perfil)][c.dataset.perm as Permissao] = c.checked;
        });
        return nova;
      };
      const conferir = () => {
        const problemas = validarMatriz(ler());
        caixa.textContent = problemas.length ? `Regra inválida: ${problemas.join(' ')} Ajuste antes de salvar.` : '';
        return problemas;
      };
      qsa(raiz, 'input[data-perm]').forEach((c) => c.addEventListener('change', conferir));

      const gravar = (nova: MatrizPermissoes) => {
        if (salvarMatriz(nova).length) return;
        avisar('Permissões salvas.');
        navegar('/permissoes');
      };

      qs(raiz, '[data-salvar]').addEventListener('click', () => {
        const nova = ler();
        if (conferir().length) {
          avisar('Corrija a regra inválida antes de salvar.', 'erro');
          return;
        }
        const emUso = perfisEmUsoAlterados(nova);
        if (!emUso.length) return gravar(nova);
        abrirModal({
          titulo: 'Perfis em uso',
          corpo: html`<p>A mudança afeta ${emUso.map((p, i) => html`${i ? ', ' : ''}<strong>${p.nome}</strong> (${p.usuarios} usuário${p.usuarios > 1 ? 's' : ''})`)}. Essas pessoas passam a seguir a nova regra no próximo clique.</p>`,
          confirmar: 'Aplicar mudanças',
          aoConfirmar: () => gravar(nova),
        });
      });

      qs(raiz, '[data-novo]').addEventListener('click', () =>
        abrirModal({
          titulo: 'Novo perfil',
          corpo: html`
            <div class="campo">
              <label for="nome-perfil">Nome do perfil</label>
              <input class="input" id="nome-perfil" name="nome" maxlength="${LIMITE.perfil_nome}" placeholder="Ex.: Coordenação" />
            </div>
            <div class="campo">
              <label for="desc-perfil">Descrição</label>
              <textarea class="textarea" id="desc-perfil" name="descricao" maxlength="${LIMITE.perfil_descricao}" placeholder="Quem usa este perfil e para quê"></textarea>
            </div>
            <p style="font-size:13px">O perfil começa sem permissões; marque na tabela o que ele pode fazer.</p>`,
          confirmar: 'Criar perfil',
          aoConfirmar(form) {
            const d = lerFormulario(form);
            const erro = criarPerfil(d.nome, d.descricao);
            if (erro) return erro;
            avisar('Perfil criado. Agora marque as permissões.');
            navegar('/permissoes');
            return null;
          },
        }),
      );
    },
  };
}
