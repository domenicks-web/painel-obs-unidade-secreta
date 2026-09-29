import { useEffect, useReducer, useRef } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { normalizarPix, type Pix } from '../live/tipos';
import { DURACAO, FILA_VAZIA, reduzirFila } from '../alerta/fila';
import { CartaoAlerta } from '../alerta/CartaoAlerta';
import { Palco, usarFundoTransparente } from '../telas/Palco';

export function AlertaPage() {
  usarFundoTransparente();
  const teste = import.meta.env.DEV && new URLSearchParams(location.search).get('teste') === '1';
  const [fila, despachar] = useReducer(reduzirFila, FILA_VAZIA);
  const som = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const canal = supabase
      .channel('pix-alerta')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pix' }, (p: RealtimePostgresChangesPayload<Pix>) => {
        if (p.eventType === 'INSERT') despachar({ tipo: 'novo', pix: normalizarPix(p.new) });
        else if (p.eventType === 'UPDATE') despachar({ tipo: 'mudou', pix: normalizarPix(p.new) });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  // só em dev: /alerta?teste=1 solta um PIX fictício a cada 8 s, pra ver o visual sem gravar nada
  useEffect(() => {
    if (!teste) return;
    let n = 0;
    const soltar = () =>
      despachar({
        tipo: 'novo',
        pix: { id: `teste-${n++}`, nome: 'TIAGÃO', valor: 25, msg: 'PRA PIZZA DA RAPAZIADA', origem: 'manual', externo_id: null, off: false, created_at: '' },
      });
    soltar();
    const iv = setInterval(soltar, 8000);
    return () => clearInterval(iv);
  }, [teste]);

  useEffect(() => {
    if (!fila.fase) return;
    if (fila.fase === 'entrando') {
      som.current ??= new Audio('/alerta.mp3');
      try {
        som.current.currentTime = 0;
        som.current.play()?.catch(() => {}); // sem arquivo ou autoplay bloqueado: segue mudo
      } catch {
        // jsdom/navegador sem suporte: segue mudo
      }
    }
    const t = setTimeout(
      () => despachar({ tipo: 'avancar' }),
      DURACAO[fila.fase === 'entrando' ? 'entrar' : fila.fase === 'parado' ? 'parado' : 'sair'],
    );
    return () => clearTimeout(t);
  }, [fila.fase, fila.atual?.id]);

  return <Palco>{fila.atual && fila.fase && <CartaoAlerta pix={fila.atual} fase={fila.fase} />}</Palco>;
}
