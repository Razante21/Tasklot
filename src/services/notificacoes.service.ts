/**
 * RF19 / UC19 · Notificar atualizações do chamado.
 * Tabelas: NOTIFICACAO, Ususario_Not_recebe, Notifica_Chama_gera e Hist_Notifica_origina.
 * As funções notificar* devem rodar DENTRO da transacao() de quem alterou o chamado.
 */
import type { Notificacao } from '@/core/types';
import { tabelas, transacao } from '@/data/db';
import { inserirNotificacao } from '@/data/operacoes';
import { permissoesDoPerfil } from './permissoes.service';

export function notificar(idUsuario: number | null | undefined, idChamado: number, mensagem: string, tipo: string, idHistorico?: number): void {
  if (!idUsuario) return;
  inserirNotificacao(tabelas(), { idUsuario, idChamado, idHistorico, mensagem, tipo, data: new Date().toISOString() });
}

/** Avisa todos os usuários ativos que atendem a fila. */
export function notificarEquipeTI(idChamado: number, mensagem: string, tipo: string, idHistorico?: number, exceto?: number): void {
  tabelas()
    .USUARIO.filter((u) => u.situacao === 'ativo' && u.id_usuario !== exceto && permissoesDoPerfil(u.FK_PERFIL_id_perfil).ver_fila)
    .forEach((u) => notificar(u.id_usuario, idChamado, mensagem, tipo, idHistorico));
}

export function notificacoesDe(idUsuario: number): Notificacao[] {
  const t = tabelas();
  const minhas = new Set(t.Ususario_Not_recebe.filter((r) => r.fk_USUARIO_id_usuario === idUsuario).map((r) => r.fk_NOTIFICACAO_id_notificacao));
  return t.NOTIFICACAO.filter((n) => minhas.has(n.id_notificacao))
    .map((n) => {
      const idChamado = t.Notifica_Chama_gera.find((g) => g.fk_NOTIFICACAO_id_notificacao === n.id_notificacao)?.fk_CHAMADO_id_chamado;
      return {
        id: n.id_notificacao,
        usuarioId: idUsuario,
        chamadoProtocolo: t.CHAMADO.find((c) => c.id_chamado === idChamado)?.protocolo ?? '',
        texto: n.mensagem,
        data: n.data_envio,
        lida: Boolean(n.data_leitura),
      };
    })
    .sort((a, b) => b.data.localeCompare(a.data));
}

export function naoLidas(idUsuario: number): number {
  return notificacoesDe(idUsuario).filter((n) => !n.lida).length;
}

export function marcarComoLida(id: number): void {
  const n = tabelas().NOTIFICACAO.find((x) => x.id_notificacao === id);
  if (n && !n.data_leitura) transacao(() => (n.data_leitura = new Date().toISOString()));
}

export function marcarTodasComoLidas(idUsuario: number): void {
  const ids = new Set(notificacoesDe(idUsuario).filter((n) => !n.lida).map((n) => n.id));
  if (!ids.size) return;
  transacao(() => {
    const agora = new Date().toISOString();
    tabelas().NOTIFICACAO.forEach((n) => {
      if (ids.has(n.id_notificacao)) n.data_leitura = agora;
    });
  });
}
