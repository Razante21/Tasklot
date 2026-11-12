/**
 * Camada de armazenamento.
 *
 * Nesta primeira versão os dados ficam no localStorage do navegador, mas
 * organizados nas MESMAS tabelas do modelo lógico (data/tabelas.ts).
 * Os serviços (src/services) nunca acessam o localStorage direto: usam
 * `tabelas()`, `complementos()` e `transacao()`. Para ligar o banco real,
 * troca-se este arquivo e os serviços continuam iguais.
 */
import type { Complementos, Tabelas } from './tabelas';
import { criarBancoInicial } from './seed';

export const VERSAO_BANCO = 2;
const CHAVE = 'tasklot:bd';

export interface Banco {
  versao: number;
  tabelas: Tabelas;
  complementos: Complementos;
}

let cache: Banco | null = null;

function carregar(): Banco {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (bruto) {
      const dados = JSON.parse(bruto) as Banco;
      if (dados.versao === VERSAO_BANCO) return dados;
    }
  } catch {
    /* sem localStorage: segue só em memória */
  }
  return criarBancoInicial();
}

function banco(): Banco {
  if (!cache) {
    cache = carregar();
    gravar();
  }
  return cache;
}

export const tabelas = (): Tabelas => banco().tabelas;
export const complementos = (): Complementos => banco().complementos;

/** Grava no navegador. Retorna false se não conseguiu (RNF15). */
function gravar(): boolean {
  if (!cache) return false;
  try {
    localStorage.setItem(CHAVE, JSON.stringify(cache));
    return true;
  } catch {
    return false;
  }
}

export class ErroGravacao extends Error {
  constructor() {
    super('Não foi possível salvar. Verifique o espaço do navegador e tente de novo; nada foi alterado.');
  }
}

/**
 * Executa uma alteração "tudo ou nada" (RNF15): se der erro no meio
 * ou se a gravação falhar, os dados voltam exatamente como estavam.
 */
export function transacao<T>(alterar: () => T): T {
  const antes = JSON.stringify(banco());
  try {
    const resultado = alterar();
    if (!gravar()) throw new ErroGravacao();
    return resultado;
  } catch (erro) {
    cache = JSON.parse(antes) as Banco;
    throw erro;
  }
}

/** Próximo id (como AUTO_INCREMENT) de uma lista. */
export function proximoId<T>(lista: T[], campo: keyof T): number {
  return lista.reduce((max, item) => Math.max(max, Number(item[campo]) || 0), 0) + 1;
}

/* ---------- Backup e recuperação (RNF11) ---------- */

export function exportarBackup(): string {
  return JSON.stringify({ ...banco(), exportadoEm: new Date().toISOString() }, null, 2);
}

export function importarBackup(texto: string): string | null {
  let dados: Banco;
  try {
    dados = JSON.parse(texto) as Banco;
  } catch {
    return 'O arquivo não é um backup válido do Tasklot.';
  }
  if (dados.versao !== VERSAO_BANCO || !dados.tabelas?.USUARIO || !dados.tabelas?.CHAMADO) {
    return 'O arquivo não é um backup desta versão do Tasklot.';
  }
  const anterior = cache;
  cache = { versao: dados.versao, tabelas: dados.tabelas, complementos: dados.complementos };
  if (!gravar()) {
    cache = anterior;
    return new ErroGravacao().message;
  }
  return null;
}

/** Volta os dados de exemplo ao estado inicial. */
export function restaurarDadosIniciais(): void {
  cache = criarBancoInicial();
  gravar();
}

/** Só para os testes automatizados. */
export function _usarBancoEmMemoria(novo: Banco): void {
  cache = novo;
}
