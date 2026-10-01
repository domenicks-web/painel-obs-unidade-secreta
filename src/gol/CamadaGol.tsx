import { useEffect } from 'react';
import type { EstadoLive } from '../live/tipos';
import { useOffsetServidor } from '../live/relogioServidor';
import { AnimacaoGol } from './AnimacaoGol';
import { useGolAoVivo } from './useGolAoVivo';

const SOM = '/gol-apito.wav';

/** Animação de gol por cima da cena (fonte /gol no OBS; na prévia do painel, sem som). */
export function CamadaGol({ estado, comSom }: { estado: EstadoLive; comSom: boolean }) {
  const offset = useOffsetServidor();
  const { gol, saindo } = useGolAoVivo(estado.golEvento, offset);
  const tocarSom = comSom && estado.golSom;

  useEffect(() => {
    if (!gol || !tocarSom) return;
    const audio = new Audio(SOM);
    audio.volume = 0.35;
    // navegador comum bloqueia som sem clique; a fonte do OBS toca
    audio.play().catch(() => null);
    return () => audio.pause();
  }, [gol?.id, tocarSom]);

  return gol ? <AnimacaoGol gol={gol} saindo={saindo} timeA={estado.timeA} timeB={estado.timeB} /> : null;
}
