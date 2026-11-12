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
let sessaoMemoria: number | null = null;

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
  try {
    localStorage.setItem(CHAVE_SESSAO, String(usuario.id_usuario));
  } catch {
    sessaoMemoria = usuario.id_usuario;
  }
  return { ok: true, erros: {} };
}

export function usuarioLogado(): Usuario | null {
  let id: number | null = sessaoMemoria;
  try {
    const salvo = localStorage.getItem(CHAVE_SESSAO);
    if (salvo) id = Number(salvo);
  } catch {
    /* sem storage */
  }
  if (!id) return null;
  const linha = tabelas().USUARIO.find((u) => u.id_usuario === id);
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
  sessaoMemoria = id;
  try {
    localStorage.setItem(CHAVE_SESSAO, String(id));
  } catch {
    /* sem storage */
  }
}
