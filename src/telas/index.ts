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
import { TelaFutebol } from './TelaFutebol';
import { TelaFilme } from './TelaFilme';

export type { PropsTela } from './tipos';

export const TELA_COMPONENTE: Record<TelaId, (p: PropsTela) => JSX.Element> = {
  inicio: TelaInicio,
  intervalo: TelaIntervalo,
  fim: TelaFim,
  tecnico: TelaTecnico,
  host: TelaHost,
  mesa: TelaMesa,
  lower: TelaLower,
  futebol: TelaFutebol,
  filme: TelaFilme,
};
