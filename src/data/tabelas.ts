/**
 * Tabelas do banco de dados do Tasklot, IGUAIS ao modelo lógico entregue
 * (brModelo: "Lógico Principal Finalizado"). Nomes de tabelas e campos
 * foram mantidos exatamente como no modelo para facilitar a troca do
 * localStorage pelo banco real (MySQL) no próximo semestre.
 *
 * Tamanhos (VARCHAR) do modelo estão em data/limites.ts e são respeitados
 * nos formulários.
 *
 * Observação: datas estão como texto ISO com hora. No modelo os campos são
 * DATE; no banco real recomenda-se DATETIME para não perder o horário (RF06).
 */

/* ---------- Acesso ---------- */

export interface PERFIL {
  id_perfil: number;
  descricao: string; // VARCHAR(300)
  situacao: string; // VARCHAR(300) — 'ativo' | 'inativo'
  nome: string; // VARCHAR(30)
}

export interface PERMISSAO {
  id_permissao: number;
  codigo: number; // INTEGER — ver CODIGO_PERMISSAO em core/labels.ts
  descricao: string; // VARCHAR(300)
  situacao: string; // VARCHAR(300)
}

export interface Perfil_Permissao_autoriza {
  id: number;
  fk_PERMISSAO_id_permissao: number;
  fk_PERFIL_id_perfil: number;
}

export interface CREDENCIAL {
  id_credencial: number;
  login: string; // VARCHAR(40)
  senha_hash: string; // VARCHAR(25)
  ultimo_login: string | null; // VARCHAR(40)
  situacao: string; // VARCHAR(300)
}

export interface USUARIO {
  id_usuario: number;
  identificacao: number | null; // INTEGER (matrícula)
  email_institucional: string; // VARCHAR(40)
  situacao: string; // VARCHAR(300) — 'ativo' | 'inativo'
  data_inativacao: string | null; // DATE
  nome_completo: string; // VARCHAR(75)
  contato_principal: string; // VARCHAR(40)
  forma_contato: string; // VARCHAR(50)
  data_cadastro: string; // DATE
  FK_PERFIL_id_perfil: number;
  FK_CREDENCIAL_id_credencial: number;
  /** Atendimento atual do técnico (no modelo a FK fica no usuário). */
  FK_ATENDIMENTO_id_atendimento: number | null;
  /** Último evento de histórico registrado pelo usuário. */
  FK_HISTORICO_CHAMADO_id_historico: number | null;
}

/* ---------- Locais e equipamentos ---------- */

export interface LOCAL {
  id_local: number;
  nome: string; // VARCHAR(75)
  bloco: string; // CHAR(50)
  sala: string; // VARCHAR(55)
  descricao: string; // VARCHAR(100)
  situacao: string; // VARCHAR(200) — 'ativo' | 'inativo'
}

export interface TIPO_EQUIPAMENTO {
  id_tipo_equipamento: number;
  nome: string; // VARCHAR(75)
  descricao: string; // VARCHAR(100)
  situacao: string; // VARCHAR(200)
}

export interface EQUIPAMENTO {
  id_equipamento: number;
  identificacao_patrimonial: string; // VARCHAR(100)
  codigo_interno: number | null; // INTEGER
  marca: string; // VARCHAR(50)
  modelo: string; // VARCHAR(50)
  numero_serie: string; // VARCHAR(40)
  situacao: string; // VARCHAR(200) — operacional | em_manutencao | fora_de_uso | inativo
  /** Último chamado ligado ao equipamento (no modelo a FK fica no equipamento). */
  FK_CHAMADO_id_chamado: number | null;
  FK_TIPO_EQUIPAMENTO_id_tipo_equipamento: number;
}

export interface Equipamento_local_localiza {
  id: number;
  fk_LOCAL_id_local: number;
  fk_EQUIPAMENTO_id_equipamento: number;
}

/* ---------- Chamados ---------- */

export interface CHAMADO {
  id_chamado: number;
  protocolo: string; // VARCHAR(200) — ex.: T-0148
  titulo: string; // VARCHAR(50)
  descricao: string; // VARCHAR(300)
  data_abertura: string; // DATE
  data_atualizacao: string; // DATE
  data_encerramento: string | null; // DATE
  /** Atendimento atual do chamado. */
  FK_ATENDIMENTO_id_atendimento: number | null;
  FK_LOCAL_id_local: number;
}

/** No modelo cada linha de status pertence a um chamado: guarda o status atual dele. */
export interface STATUS_CHAMADO {
  id_status: number;
  descricao: string; // VARCHAR(300)
  nome: string; // VARCHAR(75) — Aberto | Em andamento | Resolvido | Fechado
  FK_CHAMADO_id_chamado: number;
}

/** Idem: guarda a prioridade atual de cada chamado. */
export interface PRIORIDADE {
  id_prioridade: number;
  nome: string; // VARCHAR(75) — Baixa | Média | Alta
  nivel: string; // CHAR(1) — '1' | '2' | '3'
  descricao: string; // VARCHAR(100)
  FK_CHAMADO_id_chamado: number;
}

export interface ATENDIMENTO {
  id_atendimento: number;
  data_hora: string; // DATE
  comentario: string; // VARCHAR(50)
  procedimentos_realizados: string; // VARCHAR(55)
  materiais_utilizados: string; // VARCHAR(75)
  orientacoes_fornecidas: string; // VARCHAR(75)
  solucao_aplicada: string; // VARCHAR(50)
}

export interface HISTORICO_CHAMADO {
  id_historico: number;
  tipo_evento: string; // VARCHAR(40)
  descricao: string; // VARCHAR(300)
  data_hora: string; // DATE
}

export interface hist_chamado_mantem {
  id: number;
  fk_HISTORICO_CHAMADO_id_historico: number;
  fk_CHAMADO_id_chamado: number;
}

export interface Hist_Status_status {
  Id: number;
  fk_HISTORICO_CHAMADO_id_historico: number;
  fk_STATUS_CHAMADO_id_status: number;
}

export interface Usuario_chama_solicita {
  fk_USUARIO_id_usuario: number;
  fk_CHAMADO_id_chamado: number;
}

/* ---------- Notificações ---------- */

export interface NOTIFICACAO {
  id_notificacao: number;
  mensagem: string; // VARCHAR(80)
  data_envio: string; // DATE
  data_leitura: string | null; // DATE
  situacao_envio: string; // VARCHAR(20) — enviada | falhou
  tipo: string; // VARCHAR(30)
}

export interface Ususario_Not_recebe {
  id: number;
  fk_USUARIO_id_usuario: number;
  fk_NOTIFICACAO_id_notificacao: number;
}

export interface Notifica_Chama_gera {
  id: number;
  fk_NOTIFICACAO_id_notificacao: number;
  fk_CHAMADO_id_chamado: number;
}

export interface Hist_Notifica_origina {
  Id: number;
  fk_HISTORICO_CHAMADO_id_historico: number;
  fk_NOTIFICACAO_id_notificacao: number;
}

/** As 21 tabelas do modelo lógico. */
export interface Tabelas {
  PERFIL: PERFIL[];
  PERMISSAO: PERMISSAO[];
  Perfil_Permissao_autoriza: Perfil_Permissao_autoriza[];
  CREDENCIAL: CREDENCIAL[];
  USUARIO: USUARIO[];
  LOCAL: LOCAL[];
  TIPO_EQUIPAMENTO: TIPO_EQUIPAMENTO[];
  EQUIPAMENTO: EQUIPAMENTO[];
  Equipamento_local_localiza: Equipamento_local_localiza[];
  CHAMADO: CHAMADO[];
  STATUS_CHAMADO: STATUS_CHAMADO[];
  PRIORIDADE: PRIORIDADE[];
  ATENDIMENTO: ATENDIMENTO[];
  HISTORICO_CHAMADO: HISTORICO_CHAMADO[];
  hist_chamado_mantem: hist_chamado_mantem[];
  Hist_Status_status: Hist_Status_status[];
  Usuario_chama_solicita: Usuario_chama_solicita[];
  NOTIFICACAO: NOTIFICACAO[];
  Ususario_Not_recebe: Ususario_Not_recebe[];
  Notifica_Chama_gera: Notifica_Chama_gera[];
  Hist_Notifica_origina: Hist_Notifica_origina[];
}

/**
 * COMPLEMENTOS — informações que a documentação exige mas que o modelo
 * entregue não tem onde guardar. Ficam separadas para o grupo saber
 * exatamente o que incluir no banco na próxima versão (ver docs/MAPEAMENTO-BD.md).
 */
export interface Complementos {
  /** RF04/RF06: responsável atual de cada chamado. */
  chamado_responsavel: { id_chamado: number; id_usuario: number }[];
  /** RF02/RF07: aparelho de cada chamado (o modelo só guarda o último chamado do aparelho). */
  chamado_equipamento: { id_chamado: number; id_equipamento: number }[];
  /** RF06: quem registrou cada evento do histórico. */
  historico_autor: { id_historico: number; id_usuario: number }[];
  /** RF17: atendimentos anteriores (o chamado só aponta para o atendimento atual). */
  historico_atendimento: { id_historico: number; id_atendimento: number }[];
  /** RNF10: auditoria dos cadastros (não existe tabela no modelo). */
  AUDITORIA: {
    id_auditoria: number;
    data_hora: string;
    id_usuario: number;
    acao: string;
    registro: string;
    detalhe: string;
  }[];
}
