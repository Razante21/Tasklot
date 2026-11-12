/** Prepara um banco novo, só em memória, antes de cada teste. */
import { _usarBancoEmMemoria } from '@/data/db';
import { criarBancoInicial } from '@/data/seed';
import { _entrarComo, sair } from '@/services/auth.service';

export const ID = { carlos: 1, beatriz: 2, rafael: 3, marina: 4, luciana: 5, paulo: 6, jorge: 7 };

export function bancoNovo(): void {
  localStorage.clear();
  _usarBancoEmMemoria(criarBancoInicial());
  sair();
}

export const entrarComo = (id: number) => _entrarComo(id);
