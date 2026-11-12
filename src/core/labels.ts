/** Textos exibidos na tela e códigos usados nas tabelas de domínio. */
import type { AcaoAuditoria, Permissao, Prioridade, SituacaoEquipamento, StatusChamado } from './types';

/* ---------- STATUS_CHAMADO.nome ---------- */
export const STATUS_LABEL: Record<StatusChamado, string> = {
  aberto: 'Aberto',
  em_andamento: 'Em andamento',
  resolvido: 'Resolvido',
  fechado: 'Fechado',
};
export const STATUS_DESCRICAO: Record<StatusChamado, string> = {
  aberto: 'Chamado registrado, aguardando a equipe de TI.',
  em_andamento: 'A equipe de TI está atendendo.',
  resolvido: 'Solução registrada, aguardando confirmação do solicitante.',
  fechado: 'Atendimento encerrado.',
};
export const STATUS_ORDEM: StatusChamado[] = ['aberto', 'em_andamento', 'resolvido', 'fechado'];

/** Transições permitidas para a Equipe de TI (UC06 · FS001). */
export const TRANSICOES_TI: Record<StatusChamado, StatusChamado[]> = {
  aberto: ['em_andamento', 'resolvido'],
  em_andamento: ['resolvido'],
  resolvido: ['em_andamento'],
  fechado: [],
};

/* ---------- PRIORIDADE.nome / nivel ---------- */
export const PRIORIDADE_LABEL: Record<Prioridade, string> = { baixa: 'Baixa', media: 'Média', alta: 'Alta' };
export const PRIORIDADE_NIVEL: Record<Prioridade, string> = { baixa: '1', media: '2', alta: '3' };
export const PRIORIDADE_DESCRICAO: Record<Prioridade, string> = {
  baixa: 'Pode esperar; não impede o trabalho.',
  media: 'Atrapalha, mas há alternativa.',
  alta: 'Impede uma aula ou atividade agora.',
};

/* ---------- EQUIPAMENTO.situacao ---------- */
export const SITUACAO_LABEL: Record<SituacaoEquipamento, string> = {
  operacional: 'Operacional',
  em_manutencao: 'Em manutenção',
  fora_de_uso: 'Fora de uso',
  inativo: 'Inativo',
};

export const FORMAS_CONTATO = ['Ramal', 'Telefone', 'Celular', 'E-mail'];

/* ---------- Auditoria ---------- */
export const ACAO_LABEL: Record<AcaoAuditoria, string> = {
  criacao: 'Criação',
  edicao: 'Edição',
  inativacao: 'Inativação',
  exclusao: 'Exclusão',
  permissao: 'Permissão',
};

/* ---------- PERMISSAO.codigo ---------- */
/** O modelo guarda o código da permissão como INTEGER; esta é a tabela de tradução. */
export const CODIGO_PERMISSAO: Record<number, Permissao> = {
  1: 'abrir_chamado',
  2: 'acompanhar_proprios',
  3: 'ver_fila',
  4: 'registrar_atendimento',
  5: 'reabrir_chamado',
  6: 'consultar_cadastros',
  7: 'editar_cadastros',
  8: 'inativar_cadastros',
  9: 'excluir_cadastros',
  10: 'ver_indicadores',
  11: 'configurar_permissoes',
  12: 'ver_auditoria',
};

export const CODIGO_DA_PERMISSAO = Object.fromEntries(
  Object.entries(CODIGO_PERMISSAO).map(([codigo, chave]) => [chave, Number(codigo)]),
) as Record<Permissao, number>;

/** Linhas da tela de permissões, agrupadas como no Figma (tela 35). */
export const GRUPOS_PERMISSAO: { titulo: string; itens: { chave: Permissao; label: string; dica?: string }[] }[] = [
  {
    titulo: 'Chamados',
    itens: [
      { chave: 'abrir_chamado', label: 'Abrir chamado' },
      { chave: 'acompanhar_proprios', label: 'Acompanhar os próprios chamados' },
      { chave: 'ver_fila', label: 'Ver a fila e atualizar status', dica: 'Fixo para a Equipe de TI' },
      { chave: 'registrar_atendimento', label: 'Registrar atendimento e solução', dica: 'Fixo para a Equipe de TI' },
      { chave: 'reabrir_chamado', label: 'Reabrir chamado encerrado' },
    ],
  },
  {
    titulo: 'Cadastros (usuários, locais e equipamentos)',
    itens: [
      { chave: 'consultar_cadastros', label: 'Consultar cadastros' },
      { chave: 'editar_cadastros', label: 'Cadastrar e editar' },
      { chave: 'inativar_cadastros', label: 'Inativar' },
      { chave: 'excluir_cadastros', label: 'Excluir sem vínculos' },
    ],
  },
  {
    titulo: 'Gestão',
    itens: [
      { chave: 'ver_indicadores', label: 'Ver indicadores' },
      { chave: 'configurar_permissoes', label: 'Configurar perfis e permissões' },
      { chave: 'ver_auditoria', label: 'Ver registro de auditoria' },
    ],
  },
];

export const ROTULO_PERMISSAO = Object.fromEntries(
  GRUPOS_PERMISSAO.flatMap((g) => g.itens).map((i) => [i.chave, i.label]),
) as Record<Permissao, string>;

/** Ids fixos dos perfis previstos no PI (tabela PERFIL). */
export const PERFIL_ID = { professor: 1, administracao: 2, ti: 3, gestao: 4 } as const;
