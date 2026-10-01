import { useEffect, useRef, useState } from 'react';

/** Gravado pelo banco (somar_gol / repetir_gol) junto com o placar. */
export interface GolEvento {
  id: string;
  lado: 'A' | 'B';
  a: number;
  b: number;
  /** hora do servidor (ms) */
  em: number;
  /** segundos (3 a 6) */
  dur: number;
  anim: boolean;
  anulado?: boolean;
}

// Evento mais velho que isso quando chega não toca: a fonte abriu/reconectou depois do gol.
export const ATRASO_MAX_MS = 1500;
const SAIDA_MS = 500;

/**
 * Toca cada gol uma vez só nesta fonte. O que já estava no estado quando a fonte abriu não toca.
 * `offset`: agora do servidor = Date.now() + offset (relogioServidor), pra todas as fontes
 * começarem e terminarem juntas.
 */
export function useGolAoVivo(evento: GolEvento | null | undefined, offset: number) {
  const vistos = useRef(new Set<string>(evento?.id ? [evento.id] : []));
  const [gol, setGol] = useState<GolEvento | null>(null);
  const [saindo, setSaindo] = useState(false);
  const [pulso, setPulso] = useState<{ lado: 'A' | 'B'; id: string } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const tocando = useRef<string | null>(null);

  const parar = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    tocando.current = null;
    setGol(null);
    setSaindo(false);
  };

  useEffect(() => {
    if (!evento?.id) return;
    // gol anulado enquanto toca: corta
    if (evento.anulado) {
      if (tocando.current === evento.id) parar();
      vistos.current.add(evento.id);
      return;
    }
    if (vistos.current.has(evento.id)) return;
    vistos.current.add(evento.id);
    const idade = Date.now() + offset - evento.em;
    if (idade > ATRASO_MAX_MS) return;

    setPulso({ lado: evento.lado, id: evento.id });
    if (!evento.anim) return;
    timers.current.forEach(clearTimeout);
    const resta = evento.dur * 1000 - Math.max(0, idade);
    tocando.current = evento.id;
    setGol(evento);
    setSaindo(false);
    timers.current = [setTimeout(() => setSaindo(true), Math.max(0, resta - SAIDA_MS)), setTimeout(parar, resta)];
  }, [evento, offset]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  return { gol, saindo, pulso };
}
