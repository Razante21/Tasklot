/**
 * Testes das proteções de segurança: sessão com prazo e validação do backup.
 * Rodar com: npm test
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exportarBackup, importarBackup, tabelas } from '@/data/db';
import { DURACAO_SESSAO_MS, entrar, sair, usuarioLogado } from '@/services/auth.service';
import { bancoNovo } from './ajuda';

beforeEach(bancoNovo);
afterEach(() => vi.useRealTimers());

describe('Sessão', () => {
  it('expira depois do prazo e pede login de novo', () => {
    vi.useFakeTimers();
    entrar('suporte@fatec.sp.gov.br', 'tasklot');
    vi.advanceTimersByTime(DURACAO_SESSAO_MS - 1000);
    expect(usuarioLogado()).not.toBeNull();
    vi.advanceTimersByTime(2000);
    expect(usuarioLogado()).toBeNull();
    expect(localStorage.getItem('tasklot:sessao')).toBeNull();
  });

  it('recusa sessão no formato antigo ou adulterada', () => {
    localStorage.setItem('tasklot:sessao', '3');
    expect(usuarioLogado()).toBeNull();
    localStorage.setItem('tasklot:sessao', '{"id":3}');
    expect(usuarioLogado()).toBeNull();
  });

  it('sair em uma aba vale para as outras', () => {
    entrar('suporte@fatec.sp.gov.br', 'tasklot');
    localStorage.removeItem('tasklot:sessao'); // o que outra aba faz ao sair
    expect(usuarioLogado()).toBeNull();
    sair();
  });
});

describe('Backup (RNF11)', () => {
  const backupAlterado = (mudar: (b: any) => void): string => {
    const b = JSON.parse(exportarBackup());
    mudar(b);
    return JSON.stringify(b);
  };

  it('restaura um backup exportado pelo próprio sistema', () => {
    expect(importarBackup(exportarBackup())).toBeNull();
  });

  it('aceita campos opcionais vazios', () => {
    const texto = backupAlterado((b) => {
      b.tabelas.USUARIO[0].identificacao = null;
      b.tabelas.CREDENCIAL[0].ultimo_login = null;
    });
    expect(importarBackup(texto)).toBeNull();
  });

  it.each([
    ['tabela faltando', (b: any) => delete b.tabelas.CREDENCIAL],
    ['complementos faltando', (b: any) => delete b.complementos],
    ['tabela desconhecida', (b: any) => (b.tabelas.EXTRA = [])],
    ['campo com tipo errado', (b: any) => (b.tabelas.USUARIO[0].nome_completo = { html: '<b>x</b>' })],
    ['campo desconhecido', (b: any) => (b.tabelas.USUARIO[0].admin = true)],
    ['usuário sem credencial', (b: any) => (b.tabelas.USUARIO[0].FK_CREDENCIAL_id_credencial = 999)],
    ['nenhum usuário ativo', (b: any) => b.tabelas.USUARIO.forEach((u: any) => (u.situacao = 'inativo'))],
    ['versão diferente', (b: any) => (b.versao = 1)],
  ])('recusa backup com %s e não muda nada', (_, mudar) => {
    const antes = JSON.stringify(tabelas());
    expect(importarBackup(backupAlterado(mudar))).toMatch(/backup/i);
    expect(JSON.stringify(tabelas())).toBe(antes);
  });

  it('recusa arquivo grande demais', () => {
    expect(importarBackup(' '.repeat(6 * 1024 * 1024))).toMatch(/grande demais/);
  });
});
