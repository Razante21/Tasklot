/** Tela 08 · Locais e equipamentos (RF07, RF11 / UC07, UC11). */
import { html, type Seguro } from '@/core/dom';
import { plural } from '@/core/format';
import type { Contexto, Pagina } from '@/app/router';
import { icone } from '@/components/icones';
import { cabecalho, seloSituacao, vazio } from '@/components/selos';
import { listarChamados } from '@/services/chamados.service';
import { equipamentosDoLocal, listarEquipamentos } from '@/services/equipamentos.service';
import { listarLocais, obterLocal } from '@/services/locais.service';
import { pode } from '@/services/permissoes.service';

/** Abas "Locais · 8 / Equipamentos · 12" compartilhadas com a tela de equipamentos. */
export function abasCadastro(ativa: 'locais' | 'equipamentos'): Seguro {
  return html`
    <nav class="barra-filtros" aria-label="Tipo de cadastro">
      <a class="chip" href="#/locais" aria-selected="${ativa === 'locais'}">Locais · ${listarLocais(true).length}</a>
      <a class="chip" href="#/equipamentos" aria-selected="${ativa === 'equipamentos'}">Equipamentos · ${listarEquipamentos().length}</a>
    </nav>`;
}

export function paginaLocais({ query }: Contexto): Pagina {
  const locais = listarLocais(true);
  const editar = pode('editar_cadastros');
  const abertos = new Map<number, number>();
  listarChamados()
    .filter((c) => c.status === 'aberto' || c.status === 'em_andamento')
    .forEach((c) => abertos.set(c.localId, (abertos.get(c.localId) ?? 0) + 1));

  const local = obterLocal(Number(query.get('local'))) ?? locais[0];
  const equipamentos = local ? equipamentosDoLocal(local.id) : [];

  const conteudo = html`
    <div class="pagina">
      ${cabecalho(
        'Locais e equipamentos',
        editar ? 'Controle os locais atendidos e os equipamentos de cada um.' : 'Consulta dos locais e equipamentos (somente leitura).',
        editar ? html`<a class="btn btn--contorno" href="#/locais/novo">${icone('mais')} Novo local</a>` : undefined,
      )}
      ${abasCadastro('locais')}
      ${local
        ? html`
            <div class="salas">
              <nav class="card card--sem-padding lista-salas" aria-label="Locais">
                ${locais.map((l) => {
                  const n = abertos.get(l.id) ?? 0;
                  return html`
                    <a href="#/locais?local=${l.id}" aria-current="${l.id === local.id}" class="${l.ativo ? '' : 'inativo'}">
                      <span><strong>${l.nome}</strong><small>Bloco ${l.bloco} · ${plural(equipamentosDoLocal(l.id).length, 'equipamento', 'equipamentos')}</small></span>
                      ${!l.ativo ? html`<span class="selo selo--inativo">Inativo</span>` : n ? html`<span class="selo selo--marca">${plural(n, 'aberto', 'abertos')}</span>` : html`<span style="font-size:12px;font-weight:600">OK</span>`}
                    </a>`;
                })}
              </nav>
              <section>
                <div class="sala-topo">
                  <div>
                    <h2>${local.nome} ${!local.ativo ? html`<span class="selo selo--inativo" style="vertical-align:middle">Inativo</span>` : ''}</h2>
                    <p class="mudo" style="font-size:13px">Bloco ${local.bloco}${local.sala ? ` · Sala ${local.sala}` : ''}${local.descricao ? ` · ${local.descricao}` : ''}</p>
                  </div>
                  ${editar
                    ? html`<div class="cabecalho__acoes">
                        <a class="btn btn--contorno btn--pequeno" href="#/locais/${local.id}/editar">Editar local</a>
                        ${local.ativo ? html`<a class="btn btn--escuro btn--pequeno" href="#/equipamentos/novo?local=${local.id}">${icone('monitor')} Adicionar equipamento</a>` : ''}
                      </div>`
                    : ''}
                </div>
                <div class="card card--sem-padding">
                  ${equipamentos.length
                    ? html`
                        <div class="tabela-wrap">
                          <table class="tabela tabela--responsiva">
                            <thead><tr><th>Equipamento</th><th>Patrimônio</th><th>Situação</th><th><span class="sr-only">Ações</span></th></tr></thead>
                            <tbody>
                              ${equipamentos.map(
                                (e) => html`
                                  <tr class="${e.situacao === 'inativo' ? 'apagada' : ''}">
                                    <td class="forte">${e.tipo}<span class="sub">${e.marca} ${e.modelo}</span></td>
                                    <td class="mudo num">${e.patrimonio || e.codigoInterno}</td>
                                    <td>${seloSituacao(e.situacao)}</td>
                                    <td style="text-align:right;white-space:nowrap">
                                      <a class="link" href="#/historico?q=${encodeURIComponent(e.patrimonio)}&dias=365">Ver histórico</a>
                                      ${editar ? html` · <a class="link--marca" href="#/equipamentos/${e.id}/editar">Editar</a>` : ''}
                                    </td>
                                  </tr>`,
                              )}
                            </tbody>
                          </table>
                        </div>`
                    : vazio('Local sem equipamentos', 'Cadastre os aparelhos deste local para ligar aos chamados.')}
                </div>
              </section>
            </div>`
        : html`<section class="card">${vazio('Nenhum local cadastrado', 'Cadastre o primeiro local para começar.')}</section>`}
    </div>`;

  return { titulo: 'Locais e equipamentos', html: conteudo };
}
