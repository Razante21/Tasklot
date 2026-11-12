/** Formatação de datas e textos no padrão brasileiro. */

const pad = (n: number) => String(n).padStart(2, '0');

/** 24/09 */
export function diaMes(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

/** 24/09 · 08:12 */
export function diaMesHora(iso: string): string {
  const d = new Date(iso);
  return `${diaMes(iso)} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 24/09 às 08:12 */
export function diaMesAsHora(iso: string): string {
  const d = new Date(iso);
  return `${diaMes(iso)} às ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 06/11/2026 08:12 */
export function dataHoraCompleta(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "há 10 min", "ontem", "03/11" */
export function relativo(iso: string, agora = new Date()): string {
  const diff = (agora.getTime() - new Date(iso).getTime()) / 60000;
  if (diff < 1) return 'agora';
  if (diff < 60) return `há ${Math.round(diff)} min`;
  if (diff < 60 * 24) return `há ${Math.round(diff / 60)} h`;
  if (diff < 60 * 48) return 'ontem';
  return diaMes(iso);
}

/** "Hoje, 08:12", "Ontem", "28/10" */
export function ultimoAcesso(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(hoje.getDate() - 1);
  if (d.toDateString() === hoje.toDateString()) return `Hoje, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (d.toDateString() === ontem.toDateString()) return 'Ontem';
  return diaMes(iso);
}

/** Duração em horas → "1d 6h", "5h", "40 min" */
export function duracao(horas: number): string {
  if (!isFinite(horas) || horas <= 0) return '—';
  if (horas < 1) return `${Math.round(horas * 60)} min`;
  const d = Math.floor(horas / 24);
  const h = Math.round(horas % 24);
  return d > 0 ? `${d}d ${h}h` : `${h}h`;
}

export function iniciais(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

export function plural(n: number, singular: string, pluralForma: string): string {
  return `${n} ${n === 1 ? singular : pluralForma}`;
}

/** Remove acentos e caixa para buscas. */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
