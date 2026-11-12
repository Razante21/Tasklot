/**
 * RF07 / UC07 · Gerenciar locais (tabela LOCAL).
 */
import type { Local } from '@/core/types';
import { proximoId, tabelas, transacao } from '@/data/db';
import { LIMITE } from '@/data/limites';
import type { LOCAL } from '@/data/tabelas';
import { registrarAuditoria } from './auditoria.service';

const paraLocal = (l: LOCAL): Local => ({ id: l.id_local, nome: l.nome, bloco: l.bloco.trim(), sala: l.sala, descricao: l.descricao, ativo: l.situacao === 'ativo' });

/** Por padrão só os ativos (inativos não aparecem para novos chamados, RF13). */
export function listarLocais(incluirInativos = false): Local[] {
  return tabelas()
    .LOCAL.map(paraLocal)
    .filter((l) => incluirInativos || l.ativo)
    .sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }));
}

export function obterLocal(id: number | null | undefined): Local | undefined {
  const l = id ? tabelas().LOCAL.find((x) => x.id_local === id) : undefined;
  return l && paraLocal(l);
}

export function nomeLocal(id: number | null | undefined): string {
  return obterLocal(id)?.nome ?? '—';
}

export interface DadosLocal {
  nome: string;
  bloco: string;
  sala: string;
  descricao: string;
}

export function validarLocal(d: DadosLocal, idAtual?: number): Record<string, string> {
  const erros: Record<string, string> = {};
  if (!d.nome) erros.nome = 'Informe o nome do local.';
  else if (d.nome.length > LIMITE.local_nome) erros.nome = `Use até ${LIMITE.local_nome} caracteres.`;
  else if (tabelas().LOCAL.some((l) => l.nome.toLowerCase() === d.nome.toLowerCase() && l.id_local !== idAtual)) {
    erros.nome = 'Já existe um local com este nome.'; // UC07 · FS001
  }
  if (!d.bloco) erros.bloco = 'Informe o bloco.';
  return erros;
}

export function criarLocal(d: DadosLocal): Local {
  return transacao(() => {
    const t = tabelas();
    const linha: LOCAL = { id_local: proximoId(t.LOCAL, 'id_local'), nome: d.nome, bloco: d.bloco, sala: d.sala, descricao: d.descricao, situacao: 'ativo' };
    t.LOCAL.push(linha);
    registrarAuditoria('criacao', `Local · ${d.nome}`, `Bloco ${d.bloco}${d.sala ? ` · sala ${d.sala}` : ''}`);
    return paraLocal(linha);
  });
}

export function atualizarLocal(id: number, d: DadosLocal): void {
  transacao(() => {
    const l = tabelas().LOCAL.find((x) => x.id_local === id);
    if (!l) throw new Error('Local não encontrado.');
    const mudancas: string[] = [];
    if (l.nome !== d.nome) mudancas.push(`Nome: ${l.nome} → ${d.nome}`);
    if (l.bloco !== d.bloco) mudancas.push(`Bloco: ${l.bloco} → ${d.bloco}`);
    if (l.sala !== d.sala) mudancas.push(`Sala: ${l.sala || '—'} → ${d.sala || '—'}`);
    if (l.descricao !== d.descricao) mudancas.push('Descrição alterada');
    Object.assign(l, d);
    if (mudancas.length) registrarAuditoria('edicao', `Local · ${l.nome}`, mudancas.join('; '));
  });
}

export function definirSituacaoLocal(id: number, ativo: boolean): string | null {
  const l = tabelas().LOCAL.find((x) => x.id_local === id);
  if (!l) return 'Local não encontrado.';
  if ((l.situacao === 'ativo') === ativo) return ativo ? 'O local já está ativo.' : 'O local já está inativo.';
  transacao(() => {
    l.situacao = ativo ? 'ativo' : 'inativo';
    registrarAuditoria(ativo ? 'edicao' : 'inativacao', `Local · ${l.nome}`, ativo ? 'Reativado' : 'Inativado — não aparece em novos chamados');
  });
  return null;
}

/** Equipamentos atualmente no local (última linha de Equipamento_local_localiza de cada aparelho). */
export function idsEquipamentosNoLocal(idLocal: number): number[] {
  const t = tabelas();
  const atual = new Map<number, number>();
  [...t.Equipamento_local_localiza].sort((a, b) => a.id - b.id).forEach((el) => atual.set(el.fk_EQUIPAMENTO_id_equipamento, el.fk_LOCAL_id_local));
  return [...atual.entries()].filter(([, local]) => local === idLocal).map(([eq]) => eq);
}

export function vinculosLocal(id: number): { equipamentos: number; chamados: number } {
  const t = tabelas();
  return {
    equipamentos: t.Equipamento_local_localiza.filter((e) => e.fk_LOCAL_id_local === id).length,
    chamados: t.CHAMADO.filter((c) => c.FK_LOCAL_id_local === id).length,
  };
}

/** RF14 / UC14 · só exclui sem vínculos; com vínculos a orientação é inativar. */
export function excluirLocal(id: number): boolean {
  const v = vinculosLocal(id);
  if (v.equipamentos || v.chamados) return false;
  transacao(() => {
    const t = tabelas();
    const l = t.LOCAL.find((x) => x.id_local === id);
    t.LOCAL = t.LOCAL.filter((x) => x.id_local !== id);
    if (l) registrarAuditoria('exclusao', `Local · ${l.nome}`, 'Sem equipamentos ou chamados vinculados');
  });
  return true;
}
