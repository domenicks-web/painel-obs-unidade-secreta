import type { EstadoLive } from './tipos';

export function segundosRestantes(minutos: number, timerInicio: number | null, agora: number): number {
  const total = Math.max(0, Math.round(minutos * 60));
  if (timerInicio == null) return total;
  return Math.max(0, Math.ceil(total - (agora - timerInicio) / 1000));
}

export function bolinhasCheias(restante: number, total: number): number {
  if (total <= 0) return 10;
  return Math.min(10, Math.max(0, Math.floor((1 - restante / total) * 10)));
}

export function segundosJogo(
  e: Pick<EstadoLive, 'clockInicio' | 'clockAcumulado' | 'clockRodando'>,
  agora: number,
): number {
  const trecho = e.clockRodando && e.clockInicio != null ? (agora - e.clockInicio) / 1000 : 0;
  return Math.floor(Number(e.clockAcumulado || 0) + Math.max(0, trecho));
}

export function mmss(seg: number): string {
  const s = Math.max(0, Math.floor(seg));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Tempo digitado no painel ("37:12" ou só minutos, "45") em segundos; null se não for tempo. */
export function lerTempo(texto: string): number | null {
  const m = texto.trim().match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!m) return null;
  const seg = m[2] != null ? Number(m[2]) : 0;
  return seg < 60 ? Number(m[1]) * 60 + seg : null;
}
