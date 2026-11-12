/** Mapa de todas as telas do sistema. A ordem importa: rotas fixas antes das com :id. */
import type { Rota } from './router';
import { paginaMeusChamados } from '@/pages/chamados/meus-chamados.page';
import { paginaChamadoEnviado, paginaNovoChamado } from '@/pages/chamados/novo-chamado.page';
import { paginaDetalheChamado } from '@/pages/chamados/detalhe.page';
import { paginaFila } from '@/pages/fila/fila.page';
import { paginaHistorico } from '@/pages/historico/historico.page';
import { paginaLocais } from '@/pages/locais/locais.page';
import { paginaFormLocal } from '@/pages/locais/local-form.page';
import { paginaEquipamentos } from '@/pages/equipamentos/equipamentos.page';
import { paginaFormEquipamento } from '@/pages/equipamentos/equipamento-form.page';
import { paginaUsuarios } from '@/pages/usuarios/usuarios.page';
import { paginaFormUsuario } from '@/pages/usuarios/usuario-form.page';
import { paginaIndicadores } from '@/pages/indicadores/indicadores.page';
import { paginaPermissoes } from '@/pages/permissoes/permissoes.page';
import { paginaAuditoria } from '@/pages/auditoria/auditoria.page';
import { paginaNotificacoes, paginaPerfil } from '@/pages/perfil/perfil.page';

export const ROTAS: Rota[] = [
  // Chamados (solicitante)
  { caminho: '/chamados', menu: 'meus', exige: ['acompanhar_proprios'], pagina: paginaMeusChamados },
  { caminho: '/chamados/novo', menu: 'novo', exige: ['abrir_chamado'], pagina: paginaNovoChamado },
  { caminho: '/chamados/:id/enviado', menu: 'meus', exige: ['abrir_chamado'], pagina: paginaChamadoEnviado },
  { caminho: '/chamados/:id', pagina: paginaDetalheChamado },

  // Atendimento (Equipe de TI)
  { caminho: '/fila', menu: 'fila', exige: ['ver_fila'], pagina: paginaFila },
  { caminho: '/historico', menu: 'historico', pagina: paginaHistorico },

  // Cadastros
  { caminho: '/locais', menu: 'locais', exige: ['consultar_cadastros'], pagina: paginaLocais },
  { caminho: '/locais/novo', menu: 'locais', exige: ['editar_cadastros'], pagina: paginaFormLocal },
  { caminho: '/locais/:id/editar', menu: 'locais', exige: ['editar_cadastros'], pagina: paginaFormLocal },
  { caminho: '/equipamentos', menu: 'locais', exige: ['consultar_cadastros'], pagina: paginaEquipamentos },
  { caminho: '/equipamentos/novo', menu: 'locais', exige: ['editar_cadastros'], pagina: paginaFormEquipamento },
  { caminho: '/equipamentos/:id/editar', menu: 'locais', exige: ['editar_cadastros'], pagina: paginaFormEquipamento },
  { caminho: '/usuarios', menu: 'usuarios', exige: ['consultar_cadastros'], pagina: paginaUsuarios },
  { caminho: '/usuarios/novo', menu: 'usuarios', exige: ['editar_cadastros'], pagina: paginaFormUsuario },
  { caminho: '/usuarios/:id/editar', menu: 'usuarios', exige: ['editar_cadastros'], pagina: paginaFormUsuario },

  // Gestão
  { caminho: '/indicadores', menu: 'indicadores', exige: ['ver_indicadores'], pagina: paginaIndicadores },
  { caminho: '/permissoes', menu: 'permissoes', exige: ['configurar_permissoes'], pagina: paginaPermissoes },
  { caminho: '/auditoria', menu: 'auditoria', exige: ['ver_auditoria'], pagina: paginaAuditoria },

  // Conta
  { caminho: '/perfil', menu: 'perfil', pagina: paginaPerfil },
  { caminho: '/notificacoes', pagina: paginaNotificacoes },
];
