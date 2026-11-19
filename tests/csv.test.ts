import { describe, expect, it } from 'vitest';
import { carimboArquivo, decimalBR, montarCSV } from '@/core/csv';

describe('CSV exportado', () => {
  it('separa por ponto e vírgula e escapa aspas', () => {
    expect(montarCSV([['a', 'b "c"'], [1, 2]])).toBe('"a";"b ""c"""\r\n"1";"2"');
  });

  it('linha vazia vira linha em branco', () => {
    expect(montarCSV([['a'], [], ['b']])).toBe('"a"\r\n\r\n"b"');
  });

  it('neutraliza texto que o Excel executaria como fórmula', () => {
    for (const perigoso of ['=HYPERLINK("http://x")', '+1+1', '-2+3', '@SUM(A1)']) {
      expect(montarCSV([[perigoso]])).toBe(`"'${perigoso.replace(/"/g, '""')}"`);
    }
    expect(montarCSV([['Local · =1+1']])).toBe('"Local · =1+1"');
  });

  it('não mexe em números negativos', () => {
    expect(montarCSV([[-3]])).toBe('"-3"');
  });

  it('usa vírgula decimal', () => {
    expect(decimalBR(21.25)).toBe('21,3');
    expect(decimalBR(0)).toBe('0,0');
  });

  it('carimbo do nome do arquivo', () => {
    expect(carimboArquivo(new Date(2026, 10, 9, 8, 5))).toBe('2026-11-09_0805');
  });
});
