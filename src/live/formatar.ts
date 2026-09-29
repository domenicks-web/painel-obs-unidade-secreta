import type { EstadoLive } from './tipos';

export function reais(v: number): string {
  const n = Number(v) || 0;
  const casas = Number.isInteger(n) ? 0 : 2;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

export function itensLetreiro(ticker: string): string[] {
  return ticker.split(/[●•|]/).map((x) => x.trim()).filter(Boolean);
}

export function partesPixLink(link: string): [string, string] {
  const i = link.indexOf('/');
  return i < 0 ? [link, ''] : [link.slice(0, i + 1), link.slice(i + 1)];
}

export function rotuloJogo(e: Pick<EstadoLive, 'jogo' | 'jogoOutro'>): string {
  return e.jogo === 'OUTRO' ? e.jogoOutro : e.jogo;
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
