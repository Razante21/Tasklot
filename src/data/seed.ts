/**
 * Dados iniciais (fictícios), já gravados nas tabelas do modelo lógico.
 * As datas são relativas a "agora" para os indicadores sempre fazerem sentido.
 */
import { hashSenha } from '@/core/hash';
import { CODIGO_PERMISSAO, PERFIL_ID, ROTULO_PERMISSAO } from '@/core/labels';
import type { Permissao, Prioridade, StatusChamado, TipoEvento } from '@/core/types';
import type { Banco } from './db';
import { definirResponsavel, inserirChamado, inserirNotificacao, registrarEvento, type DadosAtendimentoTabela } from './operacoes';
import type { Complementos, Tabelas } from './tabelas';

export const SENHA_INICIAL = 'tasklot';

function quando(diasAtras: number, hora = 9, minuto = 0): string {
  const d = new Date();
  // Os dados de "hoje" vão até 9h40; antes das 10h30 eles passam para ontem, para nada ficar no futuro.
  const cedo = d.getHours() * 60 + d.getMinutes() < 10 * 60 + 30;
  d.setDate(d.getDate() - diasAtras - (cedo ? 1 : 0));
  d.setHours(hora, minuto, 0, 0);
  return d.toISOString();
}

/** Permissões de cada perfil (igual à tela 35 do Figma). */
const PERMISSOES_INICIAIS: Record<number, Permissao[]> = {
  [PERFIL_ID.professor]: ['abrir_chamado', 'acompanhar_proprios', 'reabrir_chamado'],
  [PERFIL_ID.administracao]: ['abrir_chamado', 'acompanhar_proprios', 'reabrir_chamado'],
  [PERFIL_ID.ti]: [
    'ver_fila', 'registrar_atendimento', 'reabrir_chamado', 'consultar_cadastros', 'editar_cadastros',
    'inativar_cadastros', 'excluir_cadastros', 'ver_indicadores', 'configurar_permissoes', 'ver_auditoria',
  ],
  [PERFIL_ID.gestao]: ['consultar_cadastros', 'ver_indicadores', 'configurar_permissoes', 'ver_auditoria'],
};

export function criarBancoInicial(): Banco {
  const t: Tabelas = {
    PERFIL: [
      { id_perfil: PERFIL_ID.professor, nome: 'Professor', descricao: 'Abre e acompanha chamados das salas de aula e laboratórios.', situacao: 'ativo' },
      { id_perfil: PERFIL_ID.administracao, nome: 'Administração', descricao: 'Abre e acompanha chamados dos setores administrativos.', situacao: 'ativo' },
      { id_perfil: PERFIL_ID.ti, nome: 'Equipe de TI', descricao: 'Atende a fila e mantém usuários, locais e equipamentos.', situacao: 'ativo' },
      { id_perfil: PERFIL_ID.gestao, nome: 'Gestão', descricao: 'Acompanha indicadores, consulta cadastros e define permissões.', situacao: 'ativo' },
    ],
    PERMISSAO: Object.entries(CODIGO_PERMISSAO).map(([codigo, chave]) => ({
      id_permissao: Number(codigo),
      codigo: Number(codigo),
      descricao: ROTULO_PERMISSAO[chave],
      situacao: 'ativo',
    })),
    Perfil_Permissao_autoriza: [],
    CREDENCIAL: [],
    USUARIO: [],
    LOCAL: [
      { id_local: 1, nome: 'Lab 02', bloco: 'A', sala: '02', descricao: 'Laboratório de informática · térreo · 40 lugares', situacao: 'ativo' },
      { id_local: 2, nome: 'Lab 03', bloco: 'A', sala: '03', descricao: 'Laboratório de informática · térreo · 40 lugares', situacao: 'ativo' },
      { id_local: 3, nome: 'Lab 04', bloco: 'A', sala: '04', descricao: 'Laboratório de informática · 1º andar · 36 lugares', situacao: 'ativo' },
      { id_local: 4, nome: 'Administrativo', bloco: 'A', sala: 'Secretaria', descricao: 'Secretaria acadêmica e diretoria', situacao: 'ativo' },
      { id_local: 5, nome: 'Sala 08', bloco: 'B', sala: '08', descricao: 'Sala de aula · 1º andar · 45 lugares', situacao: 'ativo' },
      { id_local: 6, nome: 'Sala 12', bloco: 'B', sala: '12', descricao: 'Sala de aula · 2º andar · 45 lugares', situacao: 'ativo' },
      { id_local: 7, nome: 'Biblioteca', bloco: 'C', sala: 'Biblioteca', descricao: 'Acervo e sala de estudos', situacao: 'ativo' },
      { id_local: 8, nome: 'Auditório', bloco: 'C', sala: 'Auditório', descricao: 'Auditório principal · 150 lugares', situacao: 'ativo' },
      { id_local: 9, nome: 'Depósito 1', bloco: 'C', sala: 'Depósito', descricao: 'Desativado em 2026', situacao: 'inativo' },
    ],
    TIPO_EQUIPAMENTO: [
      'Projetor', 'Computador', 'Impressora', 'Roteador', 'Monitor', 'Switch', 'Áudio', 'Sistema / acesso',
    ].map((nome, i) => ({ id_tipo_equipamento: i + 1, nome, descricao: '', situacao: 'ativo' })),
    EQUIPAMENTO: [],
    Equipamento_local_localiza: [],
    CHAMADO: [],
    STATUS_CHAMADO: [],
    PRIORIDADE: [],
    ATENDIMENTO: [],
    HISTORICO_CHAMADO: [],
    hist_chamado_mantem: [],
    Hist_Status_status: [],
    Usuario_chama_solicita: [],
    NOTIFICACAO: [],
    Ususario_Not_recebe: [],
    Notifica_Chama_gera: [],
    Hist_Notifica_origina: [],
  };
  const c: Complementos = { chamado_responsavel: [], chamado_equipamento: [], historico_autor: [], historico_atendimento: [], AUDITORIA: [] };

  /* Permissões */
  let idPP = 1;
  Object.entries(PERMISSOES_INICIAIS).forEach(([perfil, lista]) =>
    lista.forEach((chave) => {
      const codigo = Number(Object.entries(CODIGO_PERMISSAO).find(([, k]) => k === chave)![0]);
      t.Perfil_Permissao_autoriza.push({ id: idPP++, fk_PERFIL_id_perfil: Number(perfil), fk_PERMISSAO_id_permissao: codigo });
    }),
  );

  /* Usuários + credenciais */
  const pessoas: [string, string, number | null, string, string, number, boolean, number][] = [
    // nome, e-mail, identificação, forma, contato, perfil, ativo, dias desde último acesso
    ['Carlos Lima', 'professor@fatec.sp.gov.br', 102214, 'Ramal', '214', PERFIL_ID.professor, true, 0],
    ['Beatriz Rocha', 'administracao@fatec.sp.gov.br', 100102, 'Ramal', '102', PERFIL_ID.administracao, true, 1],
    ['Rafael Martins', 'suporte@fatec.sp.gov.br', 100300, 'Ramal', '300', PERFIL_ID.ti, true, 0],
    ['Marina Alves', 'gestao@fatec.sp.gov.br', 100101, 'Ramal', '101', PERFIL_ID.gestao, true, 4],
    ['Luciana Costa', 'luciana.costa@fatec.sp.gov.br', 102220, 'Ramal', '220', PERFIL_ID.professor, true, 10],
    ['Paulo Henrique', 'paulo.henrique@fatec.sp.gov.br', 100105, 'Celular', '(19) 99876-1050', PERFIL_ID.administracao, true, 17],
    ['Jorge Pereira', 'jorge.pereira@fatec.sp.gov.br', 102190, 'E-mail', 'jorge.pereira@fatec.sp.gov.br', PERFIL_ID.professor, false, 150],
  ];
  pessoas.forEach(([nome, email, ident, forma, contato, perfil, ativo, dias], i) => {
    const id = i + 1;
    t.CREDENCIAL.push({ id_credencial: id, login: email, senha_hash: hashSenha(SENHA_INICIAL, email), ultimo_login: quando(dias, 8, 10), situacao: ativo ? 'ativo' : 'inativo' });
    t.USUARIO.push({
      id_usuario: id,
      identificacao: ident,
      email_institucional: email,
      situacao: ativo ? 'ativo' : 'inativo',
      data_inativacao: ativo ? null : quando(150).slice(0, 10),
      nome_completo: nome,
      contato_principal: contato,
      forma_contato: forma,
      data_cadastro: quando(200 - i * 10).slice(0, 10),
      FK_PERFIL_id_perfil: perfil,
      FK_CREDENCIAL_id_credencial: id,
      FK_ATENDIMENTO_id_atendimento: null,
      FK_HISTORICO_CHAMADO_id_historico: null,
    });
  });
  const [CARLOS, BEATRIZ, RAFAEL, , LUCIANA, PAULO] = [1, 2, 3, 4, 5, 6];

  /* Equipamentos (tipo, marca, modelo, patrimônio, série, local, situação) */
  const eqs: [number, string, string, string, string, number, string][] = [
    [1, 'Epson', 'PowerLite X49', 'PAT-00201', 'X4K9-22831', 2, 'em_manutencao'],
    [2, 'Dell', 'OptiPlex 3080', 'PAT-00380', '7HJ2K80', 2, 'operacional'],
    [2, 'Dell', 'OptiPlex 3080', 'PAT-00381', '7HJ2K81', 2, 'operacional'],
    [2, 'Dell', 'OptiPlex 3080', 'PAT-00202', '7HJ2K93', 1, 'operacional'],
    [2, 'Dell', 'OptiPlex 3080', 'PAT-00203', '7HJ2K94', 1, 'operacional'],
    [1, 'Epson', 'PowerLite X49', 'PAT-00205', 'X4K9-22840', 3, 'operacional'],
    [3, 'HP', 'LaserJet M428', 'PAT-00210', 'BRBSN4R1', 4, 'fora_de_uso'],
    [4, 'TP-Link', 'Archer C6', 'PAT-00215', '2213A0098', 7, 'operacional'],
    [5, 'LG', '22MK400', 'PAT-00188', '805NTAB1', 5, 'inativo'],
    [2, 'Lenovo', 'ThinkCentre M70', 'PAT-00190', 'MJ0F2K11', 5, 'operacional'],
    [6, 'TP-Link', 'TL-SG1024', 'PAT-00240', '2231B0412', 6, 'operacional'],
    [7, 'JBL', 'Control 25', 'PAT-00230', 'JB25-7781', 8, 'operacional'],
  ];
  eqs.forEach(([tipo, marca, modelo, pat, serie, local, situacao], i) => {
    const id = i + 1;
    t.EQUIPAMENTO.push({
      id_equipamento: id, identificacao_patrimonial: pat, codigo_interno: 5000 + id, marca, modelo, numero_serie: serie,
      situacao, FK_CHAMADO_id_chamado: null, FK_TIPO_EQUIPAMENTO_id_tipo_equipamento: tipo,
    });
    t.Equipamento_local_localiza.push({ id, fk_LOCAL_id_local: local, fk_EQUIPAMENTO_id_equipamento: id });
  });
  const EQ = { projetorLab03: 1, pc07Lab02: 4, projetorLab04: 6, impressora: 7, roteadorBib: 8, pcSala08: 10, switchB: 11, somAud: 12 };

  /* Chamados */
  type Ev = [TipoEvento, number, string, string, StatusChamado?, Partial<DadosAtendimentoTabela>?];
  const chamado = (protocolo: string, titulo: string, local: number, equip: number | null, prioridade: Prioridade, solicitante: number, responsavel: number | null, eventos: Ev[]) => {
    const [, , dataAbertura, texto] = eventos[0];
    const id = inserirChamado(t, c, { protocolo, titulo, descricao: texto, idLocal: local, idEquipamento: equip, idSolicitante: solicitante, prioridade, data: dataAbertura });
    if (responsavel) definirResponsavel(c, id, responsavel);
    eventos.slice(1).forEach(([tipo, autor, data, txt, status, at]) =>
      registrarEvento(t, c, {
        idChamado: id, tipo, idAutor: autor, data, texto: txt, status,
        atendimento: at ? { comentario: '', procedimentos: '', materiais: '', orientacoes: '', solucao: '', ...at } : undefined,
      }),
    );
    return id;
  };

  const t148 = chamado('T-0148', 'Projetor não liga', 2, EQ.projetorLab03, 'alta', CARLOS, RAFAEL, [
    ['abertura', CARLOS, quando(0, 8, 12), 'Projetor não liga ao pressionar o botão, luz de energia apagada. Tenho aula às 14h.'],
    ['atribuicao', RAFAEL, quando(0, 8, 40), 'Atribuído a Rafael Martins. Prioridade Alta por afetar aula.'],
    ['atendimento', RAFAEL, quando(0, 9, 15), 'Cabo e tomada testados. Suspeita de fonte; levado para bancada.', 'em_andamento',
      { comentario: 'Suspeita de fonte do projetor', procedimentos: 'Teste de cabo e tomada', orientacoes: 'Usar o projetor do Lab 04 se precisar' }],
  ]);
  chamado('T-0146', 'Sem acesso ao sistema acadêmico', 2, null, 'media', CARLOS, null, [
    ['abertura', CARLOS, quando(1, 10, 30), 'Minha senha do sistema acadêmico expirou e não consigo lançar notas.'],
  ]);
  const t141 = chamado('T-0141', 'PC reiniciando sozinho', 1, EQ.pc07Lab02, 'alta', CARLOS, RAFAEL, [
    ['abertura', CARLOS, quando(5, 13, 5), 'O computador 07 do Lab 02 reinicia sozinho no meio da aula.'],
    ['atribuicao', RAFAEL, quando(5, 13, 40), 'Atribuído a Rafael Martins.', 'em_andamento'],
    ['atendimento', RAFAEL, quando(4, 10, 0), 'Fonte trocada e drivers atualizados. Confirme se resolveu.', 'resolvido',
      { comentario: 'Fonte com defeito', procedimentos: 'Troca da fonte; drivers atualizados', materiais: '1 fonte ATX 400W', solucao: 'Troca da fonte de alimentação' }],
  ]);
  chamado('T-0137', 'Wi-Fi caindo durante a aula', 6, EQ.switchB, 'media', CARLOS, RAFAEL, [
    ['abertura', CARLOS, quando(12, 9, 0), 'A rede Wi-Fi da Sala 12 cai a cada 10 minutos.'],
    ['atendimento', RAFAEL, quando(11, 15, 0), 'Firmware do switch atualizado e canal do Wi-Fi alterado.', 'resolvido',
      { procedimentos: 'Atualização de firmware; troca de canal', solucao: 'Firmware atualizado' }],
    ['confirmacao', CARLOS, quando(10, 8, 0), 'Solicitante confirmou que o problema foi resolvido.', 'fechado'],
  ]);
  chamado('T-0133', 'Instalar VS Code nos computadores', 3, null, 'baixa', CARLOS, RAFAEL, [
    ['abertura', CARLOS, quando(16, 11, 0), 'Preciso do VS Code instalado no Lab 04 para a aula de programação.'],
    ['atendimento', RAFAEL, quando(15, 16, 0), 'VS Code instalado nos 36 computadores.', 'resolvido',
      { procedimentos: 'Instalação pela imagem padrão', solucao: 'VS Code instalado' }],
    ['confirmacao', CARLOS, quando(15, 18, 0), 'Solicitante confirmou que o problema foi resolvido.', 'fechado'],
  ]);
  chamado('T-0144', 'Internet lenta', 7, EQ.roteadorBib, 'alta', LUCIANA, RAFAEL, [
    ['abertura', LUCIANA, quando(4, 14, 0), 'A internet da biblioteca está muito lenta desde segunda.'],
    ['atendimento', RAFAEL, quando(4, 15, 30), 'Aguardando a operadora verificar o link.', 'em_andamento',
      { comentario: 'Chamado aberto na operadora', orientacoes: 'Usar a rede cabeada enquanto isso' }],
  ]);
  chamado('T-0149', 'Teclado sem resposta', 5, EQ.pcSala08, 'baixa', LUCIANA, null, [
    ['abertura', LUCIANA, quando(1, 15, 20), 'O teclado do computador do professor na Sala 08 não responde.'],
  ]);
  chamado('T-0150', 'Caixa de som sem áudio', 8, EQ.somAud, 'media', PAULO, null, [
    ['abertura', PAULO, quando(0, 7, 50), 'A caixa de som do auditório não sai áudio pelo cabo P2.'],
  ]);
  chamado('T-0153', 'Impressora não imprime', 4, EQ.impressora, 'media', BEATRIZ, null, [
    ['abertura', BEATRIZ, quando(0, 9, 40), 'A impressora da secretaria mostra papel atolado, mas não tem papel preso.'],
  ]);
  chamado('T-0121', 'Projetor sem imagem', 2, EQ.projetorLab03, 'alta', LUCIANA, RAFAEL, [
    ['abertura', LUCIANA, quando(20, 8, 0), 'O projetor liga, mas não mostra imagem do computador.'],
    ['atendimento', RAFAEL, quando(20, 10, 0), 'Cabo HDMI com mau contato substituído.', 'resolvido',
      { procedimentos: 'Troca do cabo HDMI', materiais: '1 cabo HDMI 3 m', solucao: 'Troca do cabo HDMI' }],
    ['confirmacao', LUCIANA, quando(19, 8, 0), 'Solicitante confirmou que o problema foi resolvido.', 'fechado'],
  ]);
  chamado('T-0098', 'Projetor desligando sozinho', 2, EQ.projetorLab03, 'media', CARLOS, RAFAEL, [
    ['abertura', CARLOS, quando(28, 9, 0), 'O projetor desliga sozinho depois de uns 20 minutos.'],
    ['atendimento', RAFAEL, quando(27, 11, 0), 'Filtro de ar entupido causava superaquecimento.', 'resolvido',
      { procedimentos: 'Limpeza do filtro de ar', solucao: 'Limpeza do filtro' }],
    ['confirmacao', CARLOS, quando(27, 14, 0), 'Solicitante confirmou que o problema foi resolvido.', 'fechado'],
  ]);
  chamado('T-0110', 'Impressora com manchas', 4, EQ.impressora, 'baixa', PAULO, RAFAEL, [
    ['abertura', PAULO, quando(22, 13, 0), 'As folhas saem com manchas pretas.'],
    ['atendimento', RAFAEL, quando(21, 9, 0), 'Toner trocado.', 'resolvido', { materiais: '1 toner HP 58A', solucao: 'Troca do toner' }],
    ['confirmacao', PAULO, quando(21, 11, 0), 'Solicitante confirmou que o problema foi resolvido.', 'fechado'],
  ]);

  /* Notificações */
  inserirNotificacao(t, { idUsuario: CARLOS, idChamado: t148, mensagem: 'T-0148 · Status mudou para Em andamento.', tipo: 'status', data: quando(0, 9, 15) });
  inserirNotificacao(t, { idUsuario: CARLOS, idChamado: t141, mensagem: 'T-0141 · Solução registrada. Confirme se resolveu.', tipo: 'solucao', data: quando(4, 10, 0) });
  inserirNotificacao(t, { idUsuario: RAFAEL, idChamado: 8, mensagem: 'T-0150 · Novo chamado no Auditório.', tipo: 'novo', data: quando(0, 7, 50) });
  inserirNotificacao(t, { idUsuario: RAFAEL, idChamado: 9, mensagem: 'T-0153 · Novo chamado no Administrativo.', tipo: 'novo', data: quando(0, 9, 40) });

  /* Auditoria */
  const aud = (dias: number, h: number, m: number, usuario: number, acao: string, registro: string, detalhe: string) =>
    c.AUDITORIA.push({ id_auditoria: c.AUDITORIA.length + 1, data_hora: quando(dias, h, m), id_usuario: usuario, acao, registro, detalhe });
  aud(17, 15, 2, RAFAEL, 'edicao', 'Local · Lab 03', 'Descrição: 36 → 40 lugares');
  aud(10, 11, 18, RAFAEL, 'criacao', 'Usuário · Luciana Costa', 'Perfil Professor');
  aud(4, 9, 30, RAFAEL, 'inativacao', 'Local · Depósito 1', 'Tem chamados antigos; inativado em vez de excluído');
  aud(3, 14, 22, RAFAEL, 'criacao', 'Equipamento · PAT-00215', 'Roteador TP-Link Archer C6 — Biblioteca');
  aud(2, 10, 5, 4, 'permissao', 'Perfil · Gestão', 'Adicionou "Ver registro de auditoria"');
  aud(2, 16, 40, RAFAEL, 'inativacao', 'Equipamento · PAT-00188', 'Monitor LG 22MK400 — fora de uso');
  aud(1, 8, 12, RAFAEL, 'edicao', 'Usuário · Carlos Lima', 'Contato: 210 → 214');

  return { versao: 2, tabelas: t, complementos: c };
}
