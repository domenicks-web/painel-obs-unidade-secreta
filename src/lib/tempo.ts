import { Estado } from '../types/estado';

export function formatRelogio(restMs: number): string {
  const min = Math.floor(restMs / 60_000);
  const seg = Math.floor(restMs / 1000) % 60;
  return `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;
}

export function calcularRestante(estado: Pick<Estado, 'fim' | 'minutos'>, agoraServidor: number): number {
  if (!estado.fim) return estado.minutos * 60_000;
  return Math.max(0, estado.fim - agoraServidor);
}

export function formatarTempoRelativo(desdeMs: number, agora: number): string {
  const diffMs = agora - desdeMs;
  if (diffMs < 1000) return 'agora';
  const seg = Math.floor(diffMs / 1000);
  if (seg < 60) return `há ${seg}s`;
  const min = Math.floor(seg / 60);
  if (min < 60) return `há ${min}min`;
  const horas = Math.floor(min / 60);
  return `há ${horas}h`;
}
