import type { JSX } from 'react';
import type { TelaId } from '../live/tipos';
import type { PropsTela } from './tipos';

export type { PropsTela } from './tipos';

// Tela ainda não portada renderiza nada.
export const TELA_COMPONENTE: Partial<Record<TelaId, (p: PropsTela) => JSX.Element>> = {};
