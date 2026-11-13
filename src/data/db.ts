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

/** Backups reais ficam bem abaixo disso; o limite evita travar o navegador com arquivos enormes. */
const TAMANHO_MAXIMO_BACKUP = 5 * 1024 * 1024;

const ehObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const tipoDe = (v: unknown): string => (v === null ? 'null' : typeof v);

/**
 * Tipos aceitos em cada campo, tirados do próprio banco inicial (seed):
 * o tipo visto lá ou null. Campo que só aparece como null aceita texto ou número.
 */
function formatoEsperado(linhas: object[]): Map<string, Set<string>> {
  const campos = new Map<string, Set<string>>();
  for (const linha of linhas) {
    for (const [campo, valor] of Object.entries(linha)) {
      if (!campos.has(campo)) campos.set(campo, new Set(['null']));
      campos.get(campo)!.add(tipoDe(valor));
    }
  }
  campos.forEach((tipos) => {
    if (tipos.size === 1) ['string', 'number'].forEach((t) => tipos.add(t));
  });
  return campos;
}

/** Confere se cada grupo (tabelas/complementos) tem as mesmas listas e campos do banco inicial. */
function conferirGrupo(recebido: unknown, modelo: Record<string, object[]>): string | null {
  if (!ehObjeto(recebido)) return 'faltam dados';
  const extras = Object.keys(recebido).filter((nome) => !(nome in modelo));
  if (extras.length) return `tabela desconhecida: ${extras[0]}`;
  for (const [nome, linhasModelo] of Object.entries(modelo)) {
    const linhas = recebido[nome];
    if (!Array.isArray(linhas)) return `falta a tabela ${nome}`;
    const formato = formatoEsperado(linhasModelo);
    for (const linha of linhas) {
      if (!ehObjeto(linha)) return `linha inválida em ${nome}`;
      if (!formato.size) continue; // tabela vazia no banco inicial: sem formato para comparar
      for (const campo of Object.keys(linha)) {
        if (!formato.has(campo)) return `campo desconhecido ${nome}.${campo}`;
      }
      for (const [campo, tipos] of formato) {
        const valor = linha[campo];
        if (!(campo in linha) || !tipos.has(tipoDe(valor))) return `valor inválido em ${nome}.${campo}`;
        if (typeof valor === 'number' && !Number.isFinite(valor)) return `número inválido em ${nome}.${campo}`;
      }
    }
  }
  return null;
}

/** Sem isso, um usuário apontando para credencial/perfil inexistente quebra o login e as telas. */
function conferirVinculos(t: Tabelas): string | null {
  const credenciais = new Set(t.CREDENCIAL.map((c) => c.id_credencial));
  const perfis = new Set(t.PERFIL.map((p) => p.id_perfil));
  const usuario = t.USUARIO.find((u) => !credenciais.has(u.FK_CREDENCIAL_id_credencial) || !perfis.has(u.FK_PERFIL_id_perfil));
  if (usuario) return `o usuário ${usuario.id_usuario} aponta para credencial ou perfil inexistente`;
  if (!t.USUARIO.some((u) => u.situacao === 'ativo')) return 'não há nenhum usuário ativo';
  return null;
}

/** Valida o backup inteiro antes de trocar os dados. Retorna o motivo da recusa, ou null se estiver ok. */
export function validarBackup(dados: unknown): string | null {
  if (!ehObjeto(dados) || dados.versao !== VERSAO_BANCO) return 'O arquivo não é um backup desta versão do Tasklot.';
  const modelo = criarBancoInicial();
  const problema =
    conferirGrupo(dados.tabelas, modelo.tabelas as unknown as Record<string, object[]>) ??
    conferirGrupo(dados.complementos, modelo.complementos as unknown as Record<string, object[]>) ??
    conferirVinculos(dados.tabelas as Tabelas);
  return problema ? `O backup está danificado ou foi alterado (${problema}). Nada foi mudado.` : null;
}

export function importarBackup(texto: string): string | null {
  if (texto.length > TAMANHO_MAXIMO_BACKUP) return 'O arquivo é grande demais para ser um backup do Tasklot.';
  let dados: Banco;
  try {
    dados = JSON.parse(texto) as Banco;
  } catch {
    return 'O arquivo não é um backup válido do Tasklot.';
  }
  const problema = validarBackup(dados);
  if (problema) return problema;
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
