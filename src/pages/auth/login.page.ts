/**
 * Telas 19, 23 e 41 · Login (UC01).
 * O usuário informa e-mail e senha; o perfil é descoberto pelo sistema.
 */
import { html, lerFormulario, qs, qsa } from '@/core/dom';
import { entrar } from '@/services/auth.service';
import { listarPerfis } from '@/services/permissoes.service';
import { contingencia } from '@/components/selos';
import { SENHA_INICIAL } from '@/data/seed';

/** Contas de demonstração (tela 23 do Figma). Clicar preenche e-mail e senha. */
const CONTAS = [
  { email: 'professor@fatec.sp.gov.br', perfil: 'Professor' },
  { email: 'administracao@fatec.sp.gov.br', perfil: 'Administração' },
  { email: 'suporte@fatec.sp.gov.br', perfil: 'Equipe de TI' },
  { email: 'gestao@fatec.sp.gov.br', perfil: 'Gestão' },
];

export function telaLogin(aoEntrar: () => void): { html: string; montar: (raiz: HTMLElement) => void } {
  const perfis = listarPerfis().filter((p) => p.ativo);

  const conteudo = html`
    <div class="login">
      <section class="login__lado">
        <a class="marca" href="#/login"><img src="/logo-branco.svg" alt="" /><span>Tasklot</span></a>
        <div>
          <h1>Todo chamado de TI, num só lugar.</h1>
          <p>Registre, acompanhe e consulte o histórico dos atendimentos de suporte da instituição.</p>
        </div>
        <div class="login__perfis">${perfis.map((p) => html`<span>${p.nome}</span>`)}</div>
      </section>

      <section class="login__form-area">
        <form class="login__form" novalidate>
          <div>
            <h2>Entrar</h2>
            <p class="mudo" style="margin-top:6px">Use seu e-mail institucional e sua senha.</p>
          </div>
          <p class="aviso aviso--erro" data-erro-geral role="alert"></p>

          <div class="campo">
            <label for="email">E-mail institucional</label>
            <input class="input" id="email" name="email" type="email" autocomplete="username" placeholder="nome@fatec.sp.gov.br" maxlength="40" />
            <span class="erro" data-erro="email"></span>
          </div>
          <div class="campo">
            <label for="senha">Senha</label>
            <input class="input" id="senha" name="senha" type="password" autocomplete="current-password" placeholder="Sua senha" />
            <span class="erro" data-erro="senha"></span>
          </div>

          <button class="btn btn--escuro" type="submit">Entrar</button>
          <p class="mudo" style="font-size:12.5px;text-align:center">Esqueceu a senha ou não tem acesso? Fale com a Equipe de TI.</p>
          <div class="contas-demo">
            <strong>Contas de demonstração</strong>
            <small>Senha para todas: ${SENHA_INICIAL}</small>
            ${CONTAS.map((c) => html`<button type="button" data-conta="${c.email}">${c.email} · ${c.perfil}</button>`)}
          </div>
          ${contingencia()}
        </form>
      </section>
    </div>`;

  function montar(raiz: HTMLElement): void {
    const form = qs<HTMLFormElement>(raiz, 'form');
    const erroGeral = qs(raiz, '[data-erro-geral]');
    qsa<HTMLButtonElement>(raiz, '[data-conta]').forEach((b) =>
      b.addEventListener('click', () => {
        qs<HTMLInputElement>(form, '#email').value = b.dataset.conta!;
        qs<HTMLInputElement>(form, '#senha').value = SENHA_INICIAL;
        qs<HTMLButtonElement>(form, '[type=submit]').focus();
      }),
    );
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = lerFormulario(form);
      const r = entrar(d.email, d.senha);
      qsa(form, '[data-erro]').forEach((el) => {
        const campo = el.dataset.erro as 'email' | 'senha';
        el.textContent = r.erros[campo] ?? '';
        (form.elements.namedItem(campo) as HTMLElement).toggleAttribute('aria-invalid', Boolean(r.erros[campo]));
      });
      erroGeral.textContent = r.erros.geral ?? '';
      if (r.ok) aoEntrar();
      else if (r.erros.geral) qs<HTMLInputElement>(form, '#senha').select();
    });
  }

  return { html: conteudo.valor, montar };
}
