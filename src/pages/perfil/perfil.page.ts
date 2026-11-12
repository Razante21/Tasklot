/**
 * Telas 22, 28, 43 e 45 · Meu perfil (um para cada perfil de acesso),
 * lista de notificações e backup/recuperação (RNF11) para quem administra.
 */
import { html } from '@/core/dom';
import { relativo } from '@/core/format';
import { GRUPOS_PERMISSAO } from '@/core/labels';
import type { Contexto, Pagina } from '@/app/router';
import { navegar } from '@/app/router';
import { icone } from '@/components/icones';
import { abrirModal, avisar } from '@/components/feedback';
import { avatar, cabecalho, vazio } from '@/components/selos';
import { exportarBackup, importarBackup, restaurarDadosIniciais } from '@/data/db';
import { sair } from '@/services/auth.service';
import { marcarComoLida, marcarTodasComoLidas, notificacoesDe } from '@/services/notificacoes.service';
import { obterPerfil, permissoesDoPerfil, pode } from '@/services/permissoes.service';

function baixar(nome: string, conteudo: string): void {
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'application/json' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nome });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function paginaPerfil({ usuario }: Contexto): Pagina {
  const perfil = obterPerfil(usuario.perfilId);
  const m = permissoesDoPerfil(usuario.perfilId);
  const itens = GRUPOS_PERMISSAO.flatMap((g) => g.itens).filter((i) => m[i.chave]);
  const administra = pode('configurar_permissoes');

  const conteudo = html`
    <div class="pagina">
      ${cabecalho('Meu perfil', 'Dados da conta e perfil de acesso.')}
      <div class="lado-a-lado">
        <section class="card">
          <div class="perfil-topo">
            ${avatar(usuario.nome, true)}
            <div><strong>${usuario.nome}</strong><span class="mudo">${usuario.email}</span></div>
          </div>
          <dl class="detalhes" style="margin-bottom:18px">
            <div><dt>Instituição</dt><dd>Fatec Indaiatuba</dd></div>
            <div><dt>Identificação</dt><dd>${usuario.identificacao ?? '—'}</dd></div>
            <div><dt>Contato</dt><dd>${usuario.formaContato}: ${usuario.contato || '—'}</dd></div>
            <div><dt>Perfil atual</dt><dd>${usuario.perfilNome}</dd></div>
          </dl>
          <button type="button" class="btn btn--contorno" data-sair>${icone('sair')} Sair</button>
        </section>
        <section class="card">
          <h2>Perfil de acesso</h2>
          <p class="card__sub">Seu perfil é definido pela Equipe de TI. Para mudar, abra um chamado.</p>
          <p style="margin-bottom:12px"><span class="selo selo--escuro">${usuario.perfilNome}</span></p>
          ${perfil?.descricao ? html`<p class="mudo" style="font-size:13px;margin-bottom:14px">${perfil.descricao}</p>` : ''}
          <ul class="lista-check">${itens.map((i) => html`<li>${i.label}</li>`)}</ul>
        </section>
      </div>
      ${administra
        ? html`
            <section class="card">
              <h2>Cópia de segurança</h2>
              <p class="card__sub">Nesta versão os dados ficam no navegador. Baixe uma cópia com todas as tabelas para não perder nada e restaure quando precisar.</p>
              <div class="cabecalho__acoes">
                <button type="button" class="btn btn--escuro btn--pequeno" data-backup>${icone('baixar')} Baixar cópia</button>
                <label class="btn btn--contorno btn--pequeno" for="restaurar">Restaurar de um arquivo</label>
                <input type="file" id="restaurar" accept="application/json,.json" class="sr-only" />
                <button type="button" class="btn btn--tracejado btn--pequeno" data-iniciais>Voltar aos dados iniciais</button>
              </div>
            </section>`
        : ''}
    </div>`;

  return {
    titulo: 'Meu perfil',
    html: conteudo,
    montar(raiz) {
      raiz.querySelector('[data-sair]')?.addEventListener('click', () => {
        sair();
        navegar('/login');
      });
      raiz.querySelector('[data-backup]')?.addEventListener('click', () => {
        baixar(`tasklot-backup-${new Date().toISOString().slice(0, 10)}.json`, exportarBackup());
        avisar('Cópia de segurança baixada.');
      });
      raiz.querySelector<HTMLInputElement>('#restaurar')?.addEventListener('change', async (e) => {
        const arquivo = (e.target as HTMLInputElement).files?.[0];
        if (!arquivo) return;
        const texto = await arquivo.text();
        abrirModal({
          titulo: 'Restaurar cópia de segurança?',
          corpo: html`<p>Os dados atuais serão trocados pelos do arquivo <strong>${arquivo.name}</strong>. Baixe uma cópia antes, se precisar.</p>`,
          confirmar: 'Restaurar',
          perigo: true,
          aoConfirmar() {
            const erro = importarBackup(texto);
            if (erro) return erro;
            avisar('Dados restaurados.');
            navegar('/');
            return null;
          },
        });
      });
      raiz.querySelector('[data-iniciais]')?.addEventListener('click', () =>
        abrirModal({
          titulo: 'Voltar aos dados iniciais?',
          corpo: html`<p>Tudo o que foi cadastrado será apagado e os dados de exemplo voltam. Use para preparar uma apresentação.</p>`,
          confirmar: 'Voltar aos dados iniciais',
          perigo: true,
          aoConfirmar() {
            restaurarDadosIniciais();
            avisar('Dados iniciais restaurados.');
            navegar('/');
          },
        }),
      );
    },
  };
}

export function paginaNotificacoes({ usuario }: Contexto): Pagina {
  const lista = notificacoesDe(usuario.id);
  return {
    titulo: 'Notificações',
    html: html`
      <div class="pagina" style="max-width:760px">
        ${cabecalho('Notificações', 'Avisos sobre os chamados que você abriu ou atende.', lista.some((n) => !n.lida) ? html`<button type="button" class="btn btn--contorno" data-todas>Marcar todas como lidas</button>` : undefined)}
        <section class="card card--sem-padding">
          ${lista.length
            ? html`<ul style="list-style:none;margin:0;padding:0">
                ${lista.map(
                  (n) => html`
                    <li>
                      <button type="button" class="notificacao ${n.lida ? '' : 'nao-lida'}" data-id="${n.id}" data-chamado="${n.chamadoProtocolo}">
                        <span>${n.texto}</span><small>${relativo(n.data)}</small>
                      </button>
                    </li>`,
                )}
              </ul>`
            : vazio('Tudo em dia', 'Você não tem notificações.')}
        </section>
      </div>`,
    montar(raiz) {
      raiz.querySelector('[data-todas]')?.addEventListener('click', () => {
        marcarTodasComoLidas(usuario.id);
        navegar('/notificacoes');
      });
      raiz.querySelectorAll<HTMLElement>('[data-id]').forEach((b) =>
        b.addEventListener('click', () => {
          marcarComoLida(Number(b.dataset.id));
          navegar(`/chamados/${b.dataset.chamado}`);
        }),
      );
    },
  };
}
