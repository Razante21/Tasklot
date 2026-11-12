/**
 * Itens do menu lateral. Cada item aparece só para quem tem a permissão,
 * então mudar a tela de Permissões muda o menu de cada perfil.
 */
import type { NomeIcone } from '@/components/icones';
import type { Permissao } from '@/core/types';

export interface ItemMenu {
  id: string;
  rotulo: string;
  caminho: string;
  icone: NomeIcone;
  exige?: Permissao[];
  grupo?: 'administracao';
}

export const MENU: ItemMenu[] = [
  { id: 'meus', rotulo: 'Meus chamados', caminho: '/chamados', icone: 'lista', exige: ['acompanhar_proprios'] },
  { id: 'novo', rotulo: 'Novo chamado', caminho: '/chamados/novo', icone: 'mais', exige: ['abrir_chamado'] },
  { id: 'fila', rotulo: 'Fila de chamados', caminho: '/fila', icone: 'quadro', exige: ['ver_fila'] },
  { id: 'indicadores', rotulo: 'Indicadores', caminho: '/indicadores', icone: 'grafico', exige: ['ver_indicadores'] },
  { id: 'locais', rotulo: 'Locais e equipamentos', caminho: '/locais', icone: 'porta', exige: ['consultar_cadastros'] },
  { id: 'usuarios', rotulo: 'Usuários', caminho: '/usuarios', icone: 'pessoas', exige: ['consultar_cadastros'] },
  { id: 'historico', rotulo: 'Histórico', caminho: '/historico', icone: 'relogio' },
  { id: 'permissoes', rotulo: 'Permissões', caminho: '/permissoes', icone: 'escudo', exige: ['configurar_permissoes'], grupo: 'administracao' },
  { id: 'auditoria', rotulo: 'Auditoria', caminho: '/auditoria', icone: 'documento', exige: ['ver_auditoria'], grupo: 'administracao' },
];
