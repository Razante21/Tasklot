/**
 * "Visões" usadas pelas telas. Os serviços montam estes objetos a partir das
 * tabelas do banco (data/tabelas.ts), assim as telas não precisam saber
 * como os dados estão guardados.
 */

export type StatusChamado = 'aberto' | 'em_andamento' | 'resolvido' | 'fechado';
export type Prioridade = 'baixa' | 'media' | 'alta';
export type SituacaoEquipamento = 'operacional' | 'em_manutencao' | 'fora_de_uso' | 'inativo';

/** Chaves das permissões (tabela PERMISSAO, campo codigo). */
export type Permissao =
  | 'abrir_chamado'
  | 'acompanhar_proprios'
  | 'ver_fila'
  | 'registrar_atendimento'
  | 'reabrir_chamado'
  | 'consultar_cadastros'
  | 'editar_cadastros'
  | 'inativar_cadastros'
  | 'excluir_cadastros'
  | 'ver_indicadores'
  | 'configurar_permissoes'
  | 'ver_auditoria';

export interface Perfil {
  id: number;
  nome: string;
  descricao: string;
  ativo: boolean;
}

export interface Usuario {
  id: number;
  identificacao: number | null;
  nome: string;
  email: string;
  contato: string;
  formaContato: string;
  perfilId: number;
  perfilNome: string;
  ativo: boolean;
  dataCadastro: string;
  dataInativacao: string | null;
  ultimoAcesso: string | null;
}

export interface Local {
  id: number;
  nome: string;
  bloco: string;
  sala: string;
  descricao: string;
  ativo: boolean;
}

export interface TipoEquipamento {
  id: number;
  nome: string;
}

export interface Equipamento {
  id: number;
  patrimonio: string;
  codigoInterno: number | null;
  tipoId: number;
  tipo: string;
  marca: string;
  modelo: string;
  serie: string;
  localId: number | null;
  situacao: SituacaoEquipamento;
}

/** Registro de atendimento (tabela ATENDIMENTO). */
export interface Atendimento {
  id: number;
  data: string;
  comentario: string;
  procedimentos: string;
  materiais: string;
  orientacoes: string;
  solucao: string;
}

export type TipoEvento = 'abertura' | 'atribuicao' | 'status' | 'comentario' | 'atendimento' | 'reabertura' | 'confirmacao';

/** Evento do histórico (tabela HISTORICO_CHAMADO). */
export interface EventoChamado {
  id: number;
  tipo: TipoEvento;
  autorId: number | null;
  data: string;
  texto: string;
  status?: StatusChamado;
  atendimento?: Atendimento;
}

export interface Chamado {
  id: number;
  protocolo: string; // T-0148 (é o que aparece nas telas e na URL)
  titulo: string;
  descricao: string;
  prioridade: Prioridade;
  status: StatusChamado;
  localId: number;
  equipamentoId: number | null;
  solicitanteId: number;
  responsavelId: number | null;
  criadoEm: string;
  atualizadoEm: string;
  encerradoEm: string | null;
  eventos: EventoChamado[];
}

export interface Notificacao {
  id: number;
  usuarioId: number;
  chamadoProtocolo: string;
  texto: string;
  data: string;
  lida: boolean;
}

export type AcaoAuditoria = 'criacao' | 'edicao' | 'inativacao' | 'exclusao' | 'permissao';

export interface RegistroAuditoria {
  id: number;
  data: string;
  responsavelId: number;
  acao: AcaoAuditoria;
  registro: string;
  detalhe: string;
}

export type MatrizPermissoes = Record<number, Record<Permissao, boolean>>;
