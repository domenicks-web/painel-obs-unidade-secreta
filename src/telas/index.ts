import type { JSX } from 'react';
import type { TelaId } from '../live/tipos';
import type { PropsTela } from './tipos';
import { TelaInicio } from './TelaInicio';
import { TelaIntervalo } from './TelaIntervalo';
import { TelaFim } from './TelaFim';
import { TelaTecnico } from './TelaTecnico';
import { TelaHost } from './TelaHost';
import { TelaMesa } from './TelaMesa';
import { TelaLower } from './TelaLower';

export type { PropsTela } from './tipos';

// Tela ainda não portada renderiza nada.
export const TELA_COMPONENTE: Partial<Record<TelaId, (p: PropsTela) => JSX.Element>> = {
  inicio: TelaInicio,
  intervalo: TelaIntervalo,
  fim: TelaFim,
  tecnico: TelaTecnico,
  host: TelaHost,
  mesa: TelaMesa,
  lower: TelaLower,
};
