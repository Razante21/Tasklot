/**
 * Gera e baixa um arquivo CSV no formato do Excel em português:
 * colunas separadas por ";", decimal com vírgula e acentos preservados.
 */

/** Uma linha vazia ([]) vira uma linha em branco, útil para separar blocos. */
export type LinhaCSV = (string | number)[];

/**
 * Texto que começa com = + - @ (ou tab/enter) seria executado como fórmula
 * pelo Excel. Um apóstrofo na frente faz o Excel tratar como texto comum.
 */
const INICIO_DE_FORMULA = /^[=+\-@\t\r]/;

function celula(v: string | number): string {
  let texto = String(v);
  if (typeof v === 'string' && INICIO_DE_FORMULA.test(texto)) texto = `'${texto}`;
  return `"${texto.replace(/"/g, '""')}"`;
}

/** Monta o texto do CSV (separado do download para poder ser testado). */
export function montarCSV(linhas: LinhaCSV[]): string {
  return linhas.map((l) => l.map(celula).join(';')).join('\r\n');
}

/** 21.25 → "21,3": número decimal como o Excel em português espera. */
export function decimalBR(n: number, casas = 1): string {
  return n.toFixed(casas).replace('.', ',');
}

/** Data para o nome do arquivo: "2026-11-19_1330". */
export function carimboArquivo(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

export function baixarCSV(nomeArquivo: string, linhas: LinhaCSV[]): void {
  const blob = new Blob(['﻿' + montarCSV(linhas)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
