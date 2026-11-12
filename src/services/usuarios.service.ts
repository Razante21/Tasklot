/**
 * RF09, RF11–RF14 · Usuários (tabelas USUARIO e CREDENCIAL).
 */
import { hashSenha } from '@/core/hash';
import type { Usuario } from '@/core/types';
import { complementos, proximoId, tabelas, transacao } from '@/data/db';
import { LIMITE } from '@/data/limites';
import { SENHA_INICIAL } from '@/data/seed';
import type { USUARIO } from '@/data/tabelas';
import { registrarAuditoria } from './auditoria.service';

export function paraUsuario(u: USUARIO): Usuario {
  const t = tabelas();
  const cred = t.CREDENCIAL.find((c) => c.id_credencial === u.FK_CREDENCIAL_id_credencial);
  return {
    id: u.id_usuario,
    identificacao: u.identificacao,
    nome: u.nome_completo,
    email: u.email_institucional,
    contato: u.contato_principal,
    formaContato: u.forma_contato,
    perfilId: u.FK_PERFIL_id_perfil,
    perfilNome: t.PERFIL.find((p) => p.id_perfil === u.FK_PERFIL_id_perfil)?.nome ?? '—',
    ativo: u.situacao === 'ativo',
    dataCadastro: u.data_cadastro,
    dataInativacao: u.data_inativacao,
    ultimoAcesso: cred?.ultimo_login ?? null,
  };
}

export function listarUsuarios(): Usuario[] {
  return tabelas()
    .USUARIO.map(paraUsuario)
    .sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome));
}

export function obterUsuario(id: number | null | undefined): Usuario | undefined {
  const u = id ? tabelas().USUARIO.find((x) => x.id_usuario === id) : undefined;
  return u && paraUsuario(u);
}

export function nomeUsuario(id: number | null | undefined): string {
  return obterUsuario(id)?.nome ?? '—';
}

export interface DadosUsuario {
  nome: string;
  email: string;
  identificacao: string;
  formaContato: string;
  contato: string;
  perfilId: string;
  ativo: boolean;
}

/** RNF08 · campos obrigatórios, formato, tamanho e duplicidade. */
export function validarUsuario(d: DadosUsuario, idAtual?: number): Record<string, string> {
  const t = tabelas();
  const erros: Record<string, string> = {};
  if (d.nome.trim().split(/\s+/).length < 2) erros.nome = 'Informe o nome completo (nome e sobrenome).';
  else if (d.nome.length > LIMITE.nome_completo) erros.nome = `Use até ${LIMITE.nome_completo} caracteres.`;

  const email = d.email.trim().toLowerCase();
  if (!/^[^\s@]+@fatec\.sp\.gov\.br$/.test(email)) erros.email = 'Use o e-mail institucional (@fatec.sp.gov.br).';
  else if (email.length > LIMITE.email_institucional) erros.email = `O e-mail pode ter até ${LIMITE.email_institucional} caracteres.`;
  else if (t.USUARIO.some((u) => u.email_institucional.toLowerCase() === email && u.id_usuario !== idAtual)) {
    erros.email = 'Já existe um usuário com este e-mail.'; // UC09 · FS001
  }

  if (d.identificacao) {
    if (!/^\d{1,11}$/.test(d.identificacao)) erros.identificacao = 'A identificação (matrícula) deve ter só números.';
    else if (t.USUARIO.some((u) => u.identificacao === Number(d.identificacao) && u.id_usuario !== idAtual)) {
      erros.identificacao = 'Já existe um usuário com esta identificação.';
    }
  }
  if (!d.contato) erros.contato = 'Informe um contato.';
  else if (d.contato.length > LIMITE.contato_principal) erros.contato = `Use até ${LIMITE.contato_principal} caracteres.`;

  const perfil = t.PERFIL.find((p) => p.id_perfil === Number(d.perfilId));
  if (!perfil || perfil.situacao !== 'ativo') erros.perfilId = 'Escolha um perfil de acesso válido.'; // UC09 · FS002
  return erros;
}

const hoje = () => new Date().toISOString().slice(0, 10);

export function criarUsuario(d: DadosUsuario): Usuario {
  return transacao(() => {
    const t = tabelas();
    const email = d.email.trim().toLowerCase();
    const idCred = proximoId(t.CREDENCIAL, 'id_credencial');
    t.CREDENCIAL.push({ id_credencial: idCred, login: email, senha_hash: hashSenha(SENHA_INICIAL, email), ultimo_login: null, situacao: d.ativo ? 'ativo' : 'inativo' });
    const linha: USUARIO = {
      id_usuario: proximoId(t.USUARIO, 'id_usuario'),
      identificacao: d.identificacao ? Number(d.identificacao) : null,
      email_institucional: email,
      situacao: d.ativo ? 'ativo' : 'inativo',
      data_inativacao: d.ativo ? null : hoje(),
      nome_completo: d.nome.trim(),
      contato_principal: d.contato,
      forma_contato: d.formaContato,
      data_cadastro: hoje(),
      FK_PERFIL_id_perfil: Number(d.perfilId),
      FK_CREDENCIAL_id_credencial: idCred,
      FK_ATENDIMENTO_id_atendimento: null,
      FK_HISTORICO_CHAMADO_id_historico: null,
    };
    t.USUARIO.push(linha);
    const u = paraUsuario(linha);
    registrarAuditoria('criacao', `Usuário · ${u.nome}`, `Perfil ${u.perfilNome}`);
    return u;
  });
}

export function atualizarUsuario(id: number, d: DadosUsuario): void {
  transacao(() => {
    const t = tabelas();
    const u = t.USUARIO.find((x) => x.id_usuario === id);
    if (!u) throw new Error('Usuário não encontrado.'); // UC12 · FS002
    const cred = t.CREDENCIAL.find((c) => c.id_credencial === u.FK_CREDENCIAL_id_credencial);
    const antes = paraUsuario(u);
    const email = d.email.trim().toLowerCase();
    const mudancas: string[] = [];
    if (u.nome_completo !== d.nome.trim()) mudancas.push(`Nome: ${u.nome_completo} → ${d.nome.trim()}`);
    if (u.email_institucional !== email) mudancas.push(`E-mail: ${u.email_institucional} → ${email}`);
    if (u.contato_principal !== d.contato || u.forma_contato !== d.formaContato) mudancas.push(`Contato: ${u.contato_principal} → ${d.contato}`);
    if (u.FK_PERFIL_id_perfil !== Number(d.perfilId)) {
      mudancas.push(`Perfil: ${antes.perfilNome} → ${t.PERFIL.find((p) => p.id_perfil === Number(d.perfilId))?.nome}`);
    }
    Object.assign(u, {
      nome_completo: d.nome.trim(),
      email_institucional: email,
      identificacao: d.identificacao ? Number(d.identificacao) : null,
      contato_principal: d.contato,
      forma_contato: d.formaContato,
      FK_PERFIL_id_perfil: Number(d.perfilId),
    });
    if (cred) cred.login = email;
    if (mudancas.length) registrarAuditoria('edicao', `Usuário · ${u.nome_completo}`, mudancas.join('; '));
    if (antes.ativo !== d.ativo) aplicarSituacao(u.id_usuario, d.ativo);
  });
}

function aplicarSituacao(id: number, ativo: boolean): void {
  const t = tabelas();
  const u = t.USUARIO.find((x) => x.id_usuario === id)!;
  const cred = t.CREDENCIAL.find((c) => c.id_credencial === u.FK_CREDENCIAL_id_credencial);
  u.situacao = ativo ? 'ativo' : 'inativo';
  u.data_inativacao = ativo ? null : hoje();
  if (cred) cred.situacao = u.situacao;
  registrarAuditoria(ativo ? 'edicao' : 'inativacao', `Usuário · ${u.nome_completo}`, ativo ? 'Reativado' : 'Inativado — não entra mais e sai das opções de novos chamados');
}

/** RF13 · inativar/reativar. Retorna mensagem se não fizer nada (UC13 · FS001). */
export function definirSituacaoUsuario(id: number, ativo: boolean): string | null {
  const u = tabelas().USUARIO.find((x) => x.id_usuario === id);
  if (!u) return 'Usuário não encontrado.';
  if ((u.situacao === 'ativo') === ativo) return ativo ? 'O usuário já está ativo.' : 'O usuário já está inativo.';
  transacao(() => aplicarSituacao(id, ativo));
  return null;
}

/** RF14 · vínculos que impedem a exclusão. */
export function vinculosUsuario(id: number): { chamados: number; eventos: number } {
  const t = tabelas();
  return {
    chamados: t.Usuario_chama_solicita.filter((s) => s.fk_USUARIO_id_usuario === id).length + complementos().chamado_responsavel.filter((r) => r.id_usuario === id).length,
    eventos: complementos().historico_autor.filter((h) => h.id_usuario === id).length + complementos().AUDITORIA.filter((a) => a.id_usuario === id).length,
  };
}

export function excluirUsuario(id: number): boolean {
  const v = vinculosUsuario(id);
  if (v.chamados || v.eventos) return false;
  transacao(() => {
    const t = tabelas();
    const u = t.USUARIO.find((x) => x.id_usuario === id);
    if (!u) return;
    t.USUARIO = t.USUARIO.filter((x) => x.id_usuario !== id);
    t.CREDENCIAL = t.CREDENCIAL.filter((c) => c.id_credencial !== u.FK_CREDENCIAL_id_credencial);
    const notifs = new Set(t.Ususario_Not_recebe.filter((r) => r.fk_USUARIO_id_usuario === id).map((r) => r.fk_NOTIFICACAO_id_notificacao));
    t.Ususario_Not_recebe = t.Ususario_Not_recebe.filter((r) => r.fk_USUARIO_id_usuario !== id);
    t.Notifica_Chama_gera = t.Notifica_Chama_gera.filter((r) => !notifs.has(r.fk_NOTIFICACAO_id_notificacao));
    t.Hist_Notifica_origina = t.Hist_Notifica_origina.filter((r) => !notifs.has(r.fk_NOTIFICACAO_id_notificacao));
    t.NOTIFICACAO = t.NOTIFICACAO.filter((n) => !notifs.has(n.id_notificacao));
    registrarAuditoria('exclusao', `Usuário · ${u.nome_completo}`, 'Sem chamados ou registros vinculados');
  });
  return true;
}
