import type { Pix } from '../live/tipos';

export const DURACAO = { entrar: 500, parado: 6000, sair: 500 } as const;

export type Fase = 'entrando' | 'parado' | 'saindo';
export interface EstadoFila { atual: Pix | null; fase: Fase | null; espera: Pix[] }
export type AcaoFila = { tipo: 'novo'; pix: Pix } | { tipo: 'mudou'; pix: Pix } | { tipo: 'avancar' };

export const FILA_VAZIA: EstadoFila = { atual: null, fase: null, espera: [] };

export function reduzirFila(s: EstadoFila, a: AcaoFila): EstadoFila {
  switch (a.tipo) {
    case 'novo': {
      if (a.pix.off) return s;
      if (s.atual?.id === a.pix.id || s.espera.some((x) => x.id === a.pix.id)) return s;
      if (!s.atual) return { atual: a.pix, fase: 'entrando', espera: [] };
      return { ...s, espera: [...s.espera, a.pix] };
    }
    case 'mudou':
      if (!a.pix.off) return s;
      return { ...s, espera: s.espera.filter((x) => x.id !== a.pix.id) };
    case 'avancar':
      if (s.fase === 'entrando') return { ...s, fase: 'parado' };
      if (s.fase === 'parado') return { ...s, fase: 'saindo' };
      if (s.fase === 'saindo') {
        const [prox, ...resto] = s.espera;
        return prox ? { atual: prox, fase: 'entrando', espera: resto } : FILA_VAZIA;
      }
      return s;
  }
}
