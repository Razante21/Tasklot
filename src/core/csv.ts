/** Gera e baixa um arquivo CSV (abre direto no Excel, com acentos). */
export function baixarCSV(nomeArquivo: string, linhas: (string | number)[][]): void {
  const celula = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const texto = linhas.map((l) => l.map(celula).join(';')).join('\r\n');
  const blob = new Blob(['﻿' + texto], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
