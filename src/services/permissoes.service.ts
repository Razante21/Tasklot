/**
 * RF15 / UC15 · Gerenciar perfis e permissões.
 * Tabelas: PERFIL, PERMISSAO e Perfil_Permissao_autoriza.
 */
import { CODIGO_DA_PERMISSAO, CODIGO_PERMISSAO, PERFIL_ID, ROTULO_PERMISSAO } from '@/core/labels';
import type { MatrizPermissoes, Perfil, Permissao, Usuario } from '@/core/types';
import { proximoId, tabelas, transacao } from '@/data/db';
import { caber, LIMITE } from '@/data/limites';
import type { PERFIL } from '@/data/tabelas';
import { usuarioLogado } from './auth.service';
import { registrarAuditoria } from './auditoria.service';

const TODAS = Object.values(CODIGO_PERMISSAO);

const paraPerfil = (p: PERFIL): Perfil => ({ id: p.id_perfil, nome: p.nome, descricao: p.descricao, ativo: p.situacao === 'ativo' });

export function listarPerfis(): Perfil[] {
  return tabelas().PERFIL.map(paraPerfil);
}

export function obterPerfil(id: number): Perfil | undefined {
  const p = tabelas().PERFIL.find((x) => x.id_perfil === id);
  return p && paraPerfil(p);
}

export function nomePerfil(id: number): string {
  return obterPerfil(id)?.nome ?? '—';
}

/** Permissões de um perfil, lidas da tabela associativa. */
export function permissoesDoPerfil(idPerfil: number): Record<Permissao, boolean> {
  const t = tabelas();
  const codigos = new Set(
    t.Perfil_Permissao_autoriza.filter((pp) => pp.fk_PERFIL_id_perfil === idPerfil)
      .map((pp) => t.PERMISSAO.find((p) => p.id_permissao === pp.fk_PERMISSAO_id_permissao))
      .filter((p) => p && p.situacao === 'ativo')
      .map((p) => p!.codigo),
  );
  return Object.fromEntries(TODAS.map((chave) => [chave, codigos.has(CODIGO_DA_PERMISSAO[chave])])) as Record<Permissao, boolean>;
}

export function pode(permissao: Permissao, usuario: Usuario | null = usuarioLogado()): boolean {
  if (!usuario) return false;
  return permissoesDoPerfil(usuario.perfilId)[permissao];
}

export function matrizAtual(): MatrizPermissoes {
  return Object.fromEntries(tabelas().PERFIL.map((p) => [p.id_perfil, permissoesDoPerfil(p.id_perfil)]));
}

/**
 * Caixas travadas na tela:
 * - fila e atendimento são exclusivos da Equipe de TI;
 * - a Equipe de TI sempre configura permissões (ninguém fica trancado para fora).
 */
export function eFixa(idPerfil: number, permissao: Permissao): boolean {
  if (permissao === 'ver_fila' || permissao === 'registrar_atendimento') return true;
  return permissao === 'configurar_permissoes' && idPerfil === PERFIL_ID.ti;
}

/** UC15 · FS001: regras de consistência. Lista vazia = ok. */
export function validarMatriz(m: MatrizPermissoes): string[] {
  const problemas: string[] = [];
  Object.entries(m).forEach(([id, p]) => {
    const nome = nomePerfil(Number(id));
    if ((p.excluir_cadastros || p.inativar_cadastros) && !p.editar_cadastros) {
      problemas.push(`Para "${p.excluir_cadastros ? 'Excluir sem vínculos' : 'Inativar'}" o perfil ${nome} também precisa de "Cadastrar e editar".`);
    }
    if (p.editar_cadastros && !p.consultar_cadastros) {
      problemas.push(`Para "Cadastrar e editar" o perfil ${nome} também precisa de "Consultar cadastros".`);
    }
    if (p.acompanhar_proprios !== p.abrir_chamado && !p.ver_fila) {
      problemas.push(`O perfil ${nome} precisa ter "Abrir chamado" e "Acompanhar os próprios chamados" juntos.`);
    }
  });
  return problemas;
}

/** UC15 · FS002: perfis alterados que têm usuários ativos (pede confirmação). */
export function perfisEmUsoAlterados(nova: MatrizPermissoes): { nome: string; usuarios: number }[] {
  const atual = matrizAtual();
  return Object.keys(nova)
    .map(Number)
    .filter((id) => TODAS.some((p) => atual[id]?.[p] !== nova[id][p]))
    .map((id) => ({ nome: nomePerfil(id), usuarios: tabelas().USUARIO.filter((u) => u.FK_PERFIL_id_perfil === id && u.situacao === 'ativo').length }))
    .filter((x) => x.usuarios > 0);
}

export function salvarMatriz(nova: MatrizPermissoes): string[] {
  const problemas = validarMatriz(nova);
  if (problemas.length) return problemas;
  const atual = matrizAtual();
  transacao(() => {
    const t = tabelas();
    Object.entries(nova).forEach(([idTexto, perms]) => {
      const id = Number(idTexto);
      TODAS.forEach((chave) => {
        if (atual[id]?.[chave] === perms[chave]) return;
        const idPermissao = t.PERMISSAO.find((p) => p.codigo === CODIGO_DA_PERMISSAO[chave])!.id_permissao;
        if (perms[chave]) {
          t.Perfil_Permissao_autoriza.push({ id: proximoId(t.Perfil_Permissao_autoriza, 'id'), fk_PERFIL_id_perfil: id, fk_PERMISSAO_id_permissao: idPermissao });
        } else {
          t.Perfil_Permissao_autoriza = t.Perfil_Permissao_autoriza.filter(
            (pp) => !(pp.fk_PERFIL_id_perfil === id && pp.fk_PERMISSAO_id_permissao === idPermissao),
          );
        }
        registrarAuditoria('permissao', `Perfil · ${nomePerfil(id)}`, `${perms[chave] ? 'Adicionou' : 'Removeu'} "${ROTULO_PERMISSAO[chave]}"`);
      });
    });
  });
  return [];
}

/** UC15: "seleciona um perfil existente ou cria um novo". */
export function criarPerfil(nome: string, descricao: string): string | null {
  const n = nome.trim();
  if (n.length < 3) return 'Dê um nome ao perfil (mínimo 3 letras).';
  if (n.length > LIMITE.perfil_nome) return `O nome pode ter até ${LIMITE.perfil_nome} caracteres.`;
  if (tabelas().PERFIL.some((p) => p.nome.toLowerCase() === n.toLowerCase())) return 'Já existe um perfil com esse nome.';
  transacao(() => {
    const t = tabelas();
    t.PERFIL.push({ id_perfil: proximoId(t.PERFIL, 'id_perfil'), nome: n, descricao: caber(descricao.trim(), LIMITE.perfil_descricao), situacao: 'ativo' });
    registrarAuditoria('criacao', `Perfil · ${n}`, 'Perfil criado sem permissões');
  });
  return null;
}
