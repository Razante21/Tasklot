/**
 * RF07, RF10–RF14 · Equipamentos (tabelas EQUIPAMENTO, TIPO_EQUIPAMENTO
 * e Equipamento_local_localiza).
 */
import { SITUACAO_LABEL } from '@/core/labels';
import type { Equipamento, SituacaoEquipamento, TipoEquipamento } from '@/core/types';
import { complementos, proximoId, tabelas, transacao } from '@/data/db';
import { LIMITE } from '@/data/limites';
import type { EQUIPAMENTO } from '@/data/tabelas';
import { registrarAuditoria } from './auditoria.service';
import { nomeLocal } from './locais.service';

export function listarTipos(): TipoEquipamento[] {
  return tabelas()
    .TIPO_EQUIPAMENTO.filter((t) => t.situacao === 'ativo')
    .map((t) => ({ id: t.id_tipo_equipamento, nome: t.nome }));
}

/** Local atual = última linha de Equipamento_local_localiza do aparelho. */
function localAtual(idEquipamento: number): number | null {
  const linhas = tabelas().Equipamento_local_localiza.filter((e) => e.fk_EQUIPAMENTO_id_equipamento === idEquipamento);
  return linhas.length ? linhas.reduce((a, b) => (b.id > a.id ? b : a)).fk_LOCAL_id_local : null;
}

function paraEquipamento(e: EQUIPAMENTO): Equipamento {
  return {
    id: e.id_equipamento,
    patrimonio: e.identificacao_patrimonial,
    codigoInterno: e.codigo_interno,
    tipoId: e.FK_TIPO_EQUIPAMENTO_id_tipo_equipamento,
    tipo: tabelas().TIPO_EQUIPAMENTO.find((t) => t.id_tipo_equipamento === e.FK_TIPO_EQUIPAMENTO_id_tipo_equipamento)?.nome ?? '—',
    marca: e.marca,
    modelo: e.modelo,
    serie: e.numero_serie,
    localId: localAtual(e.id_equipamento),
    situacao: e.situacao as SituacaoEquipamento,
  };
}

/** "Projetor Epson PowerLite X49" */
export function descreverEquipamento(e: Equipamento | undefined): string {
  return e ? [e.tipo, e.marca, e.modelo].filter(Boolean).join(' ') : '—';
}

export function listarEquipamentos(): Equipamento[] {
  return tabelas()
    .EQUIPAMENTO.map(paraEquipamento)
    .sort((a, b) => a.patrimonio.localeCompare(b.patrimonio));
}

export function obterEquipamento(id: number | null | undefined): Equipamento | undefined {
  const e = id ? tabelas().EQUIPAMENTO.find((x) => x.id_equipamento === id) : undefined;
  return e && paraEquipamento(e);
}

/** Equipamentos do local; por padrão sem os inativos (RF13). */
export function equipamentosDoLocal(idLocal: number, incluirInativos = true): Equipamento[] {
  return listarEquipamentos().filter((e) => e.localId === idLocal && (incluirInativos || e.situacao !== 'inativo'));
}

export interface DadosEquipamento {
  patrimonio: string;
  codigoInterno: string;
  tipoId: string;
  marca: string;
  modelo: string;
  serie: string;
  localId: string;
  situacao: SituacaoEquipamento;
}

/** RNF08 / UC10 · obrigatórios, tamanhos e duplicidade. */
export function validarEquipamento(d: DadosEquipamento, idAtual?: number): Record<string, string> {
  const t = tabelas();
  const erros: Record<string, string> = {};
  const pat = d.patrimonio.trim().toUpperCase();
  if (!pat && !d.codigoInterno) erros.patrimonio = 'Informe o patrimônio ou o código interno.';
  else if (pat.length > LIMITE.identificacao_patrimonial) erros.patrimonio = 'Patrimônio longo demais.';
  else if (pat && t.EQUIPAMENTO.some((e) => e.identificacao_patrimonial.toUpperCase() === pat && e.id_equipamento !== idAtual)) {
    erros.patrimonio = 'Este patrimônio já está cadastrado.'; // UC10 · FS001
  }
  if (d.codigoInterno) {
    if (!/^\d{1,11}$/.test(d.codigoInterno)) erros.codigoInterno = 'O código interno deve ter só números.';
    else if (t.EQUIPAMENTO.some((e) => e.codigo_interno === Number(d.codigoInterno) && e.id_equipamento !== idAtual)) {
      erros.codigoInterno = 'Este código interno já está em uso.';
    }
  }
  if (d.serie && t.EQUIPAMENTO.some((e) => e.numero_serie.toUpperCase() === d.serie.toUpperCase() && e.id_equipamento !== idAtual)) {
    erros.serie = 'Este número de série já está cadastrado.';
  }
  if (!d.tipoId) erros.tipoId = 'Escolha o tipo.';
  if (!d.localId) erros.localId = 'Escolha o local.';
  if (!d.marca) erros.marca = 'Informe a marca.';
  return erros;
}

export function criarEquipamento(d: DadosEquipamento): Equipamento {
  return transacao(() => {
    const t = tabelas();
    const id = proximoId(t.EQUIPAMENTO, 'id_equipamento');
    const linha: EQUIPAMENTO = {
      id_equipamento: id,
      identificacao_patrimonial: d.patrimonio.trim().toUpperCase(),
      codigo_interno: d.codigoInterno ? Number(d.codigoInterno) : null,
      marca: d.marca,
      modelo: d.modelo,
      numero_serie: d.serie,
      situacao: d.situacao,
      FK_CHAMADO_id_chamado: null,
      FK_TIPO_EQUIPAMENTO_id_tipo_equipamento: Number(d.tipoId),
    };
    t.EQUIPAMENTO.push(linha);
    t.Equipamento_local_localiza.push({ id: proximoId(t.Equipamento_local_localiza, 'id'), fk_LOCAL_id_local: Number(d.localId), fk_EQUIPAMENTO_id_equipamento: id });
    const e = paraEquipamento(linha);
    registrarAuditoria('criacao', `Equipamento · ${e.patrimonio || e.codigoInterno}`, `${descreverEquipamento(e)} — ${nomeLocal(e.localId)}`);
    return e;
  });
}

export function atualizarEquipamento(id: number, d: DadosEquipamento): void {
  transacao(() => {
    const t = tabelas();
    const e = t.EQUIPAMENTO.find((x) => x.id_equipamento === id);
    if (!e) throw new Error('Equipamento não encontrado.');
    const antes = paraEquipamento(e);
    const mudancas: string[] = [];
    if (antes.localId !== Number(d.localId)) {
      mudancas.push(`Local: ${nomeLocal(antes.localId)} → ${nomeLocal(Number(d.localId))}`);
      // Nova linha na associativa: o histórico de onde o aparelho esteve fica preservado.
      t.Equipamento_local_localiza.push({ id: proximoId(t.Equipamento_local_localiza, 'id'), fk_LOCAL_id_local: Number(d.localId), fk_EQUIPAMENTO_id_equipamento: id });
    }
    if (e.situacao !== d.situacao) mudancas.push(`Situação: ${SITUACAO_LABEL[antes.situacao]} → ${SITUACAO_LABEL[d.situacao]}`);
    if (e.marca !== d.marca || e.modelo !== d.modelo || e.numero_serie !== d.serie) mudancas.push('Dados do aparelho');
    Object.assign(e, {
      identificacao_patrimonial: d.patrimonio.trim().toUpperCase(),
      codigo_interno: d.codigoInterno ? Number(d.codigoInterno) : null,
      marca: d.marca,
      modelo: d.modelo,
      numero_serie: d.serie,
      situacao: d.situacao,
      FK_TIPO_EQUIPAMENTO_id_tipo_equipamento: Number(d.tipoId),
    });
    const inativou = antes.situacao !== 'inativo' && d.situacao === 'inativo';
    if (mudancas.length) registrarAuditoria(inativou ? 'inativacao' : 'edicao', `Equipamento · ${e.identificacao_patrimonial}`, mudancas.join('; '));
  });
}

/** Todos os chamados que citaram o aparelho. */
export function chamadosDoEquipamento(id: number): number {
  const ids = new Set(complementos().chamado_equipamento.filter((c) => c.id_equipamento === id).map((c) => c.id_chamado));
  const fk = tabelas().EQUIPAMENTO.find((e) => e.id_equipamento === id)?.FK_CHAMADO_id_chamado;
  if (fk) ids.add(fk);
  return ids.size;
}

/** RF14 / UC14 · equipamento com chamados não pode ser excluído (orienta inativar). */
export function excluirEquipamento(id: number): boolean {
  if (chamadosDoEquipamento(id) > 0) return false;
  transacao(() => {
    const t = tabelas();
    const e = t.EQUIPAMENTO.find((x) => x.id_equipamento === id);
    t.EQUIPAMENTO = t.EQUIPAMENTO.filter((x) => x.id_equipamento !== id);
    t.Equipamento_local_localiza = t.Equipamento_local_localiza.filter((x) => x.fk_EQUIPAMENTO_id_equipamento !== id);
    if (e) registrarAuditoria('exclusao', `Equipamento · ${e.identificacao_patrimonial}`, 'Sem chamados vinculados');
  });
  return true;
}
