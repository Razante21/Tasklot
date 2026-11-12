/**
 * RNF10 · Auditoria e rastreabilidade.
 * O modelo não tem tabela de auditoria; os registros ficam em
 * complementos.AUDITORIA (ver docs/MAPEAMENTO-BD.md).
 * Deve ser chamado DENTRO de uma transacao() do serviço que alterou os dados.
 */
import type { AcaoAuditoria, RegistroAuditoria } from '@/core/types';
import { complementos } from '@/data/db';
import { usuarioLogado } from './auth.service';

export function registrarAuditoria(acao: AcaoAuditoria, registro: string, detalhe: string): void {
  const autor = usuarioLogado();
  if (!autor) return;
  const lista = complementos().AUDITORIA;
  lista.push({
    id_auditoria: lista.reduce((m, a) => Math.max(m, a.id_auditoria), 0) + 1,
    data_hora: new Date().toISOString(),
    id_usuario: autor.id,
    acao,
    registro,
    detalhe,
  });
}

export function listarAuditoria(): RegistroAuditoria[] {
  return complementos()
    .AUDITORIA.map((a) => ({
      id: a.id_auditoria,
      data: a.data_hora,
      responsavelId: a.id_usuario,
      acao: a.acao as AcaoAuditoria,
      registro: a.registro,
      detalhe: a.detalhe,
    }))
    .sort((a, b) => b.data.localeCompare(a.data));
}
