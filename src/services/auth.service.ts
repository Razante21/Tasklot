/**
 * RF01 / UC01 · Identificar usuário.
 * O usuário informa e-mail e senha; o sistema confere a CREDENCIAL,
 * descobre o PERFIL pelo cadastro e libera só as funções autorizadas.
 */
import { hashSenha } from '@/core/hash';
import type { Usuario } from '@/core/types';
import { tabelas, transacao } from '@/data/db';
import { paraUsuario } from './usuarios.service';

const CHAVE_SESSAO = 'tasklot:sessao';
/** A sessão vale por um turno de trabalho; depois disso pede login de novo (computadores compartilhados). */
export const DURACAO_SESSAO_MS = 8 * 60 * 60 * 1000;

interface Sessao {
  id: number;
  expiraEm: number;
}

let sessaoMemoria: Sessao | null = null;

function guardarSessao(id: number): void {
  const sessao: Sessao = { id, expiraEm: Date.now() + DURACAO_SESSAO_MS };
  sessaoMemoria = null;
  try {
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
  } catch {
    sessaoMemoria = sessao; // sem storage: fica só em memória
  }
}

function sessaoValida(dados: unknown): dados is Sessao {
  return (
    typeof dados === 'object' && dados !== null &&
    Number.isInteger((dados as Sessao).id) && typeof (dados as Sessao).expiraEm === 'number'
  );
}

/** Lê a sessão salva; qualquer formato estranho ou vencido conta como "sem sessão". */
function lerSessao(): Sessao | null {
  // sessaoMemoria só existe quando o localStorage falhou ao gravar.
  let sessao: Sessao | null = sessaoMemoria;
  let salvo: string | null = null;
  try {
    salvo = localStorage.getItem(CHAVE_SESSAO);
  } catch {
    /* sem storage */
  }
  if (salvo) {
    try {
      const dados: unknown = JSON.parse(salvo);
      sessao = sessaoValida(dados) ? dados : null;
    } catch {
      sessao = null;
    }
  }
  if (!sessao || sessao.expiraEm <= Date.now()) {
    if (sessao || salvo) sair(); // apaga sessão vencida ou de formato antigo
    return null;
  }
  return sessao;
}

export interface ResultadoLogin {
  ok: boolean;
  erros: Partial<Record<'email' | 'senha' | 'geral', string>>;
}

export function entrar(email: string, senha: string): ResultadoLogin {
  const erros: ResultadoLogin['erros'] = {};
  if (!email) erros.email = 'Informe seu e-mail institucional.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erros.email = 'Digite um e-mail válido, como nome@fatec.sp.gov.br.';
  if (!senha) erros.senha = 'Informe sua senha.';
  if (Object.keys(erros).length) return { ok: false, erros };

  const t = tabelas();
  const login = email.trim().toLowerCase();
  const cred = t.CREDENCIAL.find((c) => c.login.toLowerCase() === login);
  const usuario = cred && t.USUARIO.find((u) => u.FK_CREDENCIAL_id_credencial === cred.id_credencial);

  // FS001 · Credenciais inválidas
  if (!cred || !usuario || cred.senha_hash !== hashSenha(senha, cred.login)) {
    return { ok: false, erros: { geral: 'E-mail ou senha incorretos. Confira e tente de novo.' } };
  }
  // FS002 · Usuário inativo ou sem permissão
  const perfil = t.PERFIL.find((p) => p.id_perfil === usuario.FK_PERFIL_id_perfil);
  if (usuario.situacao !== 'ativo' || cred.situacao !== 'ativo') {
    return { ok: false, erros: { geral: 'Este usuário está inativo. Procure a Equipe de TI para reativar o acesso.' } };
  }
  if (!perfil || perfil.situacao !== 'ativo') {
    return { ok: false, erros: { geral: 'Seu perfil de acesso está desativado. Procure a Equipe de TI.' } };
  }

  transacao(() => {
    cred.ultimo_login = new Date().toISOString();
  });
  guardarSessao(usuario.id_usuario);
  return { ok: true, erros: {} };
}

export function usuarioLogado(): Usuario | null {
  const sessao = lerSessao();
  if (!sessao) return null;
  const linha = tabelas().USUARIO.find((u) => u.id_usuario === sessao.id);
  return linha && linha.situacao === 'ativo' ? paraUsuario(linha) : null;
}

export function sair(): void {
  sessaoMemoria = null;
  try {
    localStorage.removeItem(CHAVE_SESSAO);
  } catch {
    /* sem storage */
  }
}

/** Só para os testes automatizados. */
export function _entrarComo(id: number): void {
  guardarSessao(id);
}
