// Playlist do /alerta controlada pelo painel.
// - A fonte do OBS (/alerta) é quem toca: ela anuncia a fila pelo canal "alerta-fila" (broadcast do
//   Realtime) a cada mudança, a cada 5 s e quando um painel pede, e obedece os comandos que o painel
//   grava em alerta_comandos (só membro grava; a fonte, anônima, só escuta).
// - O painel ouve o anúncio e mostra a fila; sem anúncio por 15 s, a fonte está fora do ar.
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Alerta, EstadoFila, useFilaAlertas } from './useFilaAlertas';

export const CANAL = 'alerta-fila';
export const CHAVE_LOCAL = 'us-alerta-fila';
const ANUNCIO_MS = 5000;
const FORA_DO_AR_MS = 15000;

export type ComandoAlerta = 'tocar' | 'remover' | 'pular' | 'pausar' | 'retomar';

export interface EstadoRemoto extends EstadoFila {
  atual: Alerta | null;
  /** fila esperando o gol sair da tela */
  segurado?: boolean;
  instancia: string;
}

type Fila = ReturnType<typeof useFilaAlertas>;

export function lerSalvo(): EstadoFila | null {
  try {
    const s = JSON.parse(localStorage.getItem(CHAVE_LOCAL) ?? 'null') as EstadoFila | null;
    if (!s || !Array.isArray(s.fila) || !Array.isArray(s.historico)) return null;
    return { fila: s.fila, historico: s.historico, pausado: !!s.pausado };
  } catch {
    return null;
  }
}

/** Na fonte do OBS: anuncia a fila, guarda no navegador e obedece os comandos do painel. */
export function useControleRemoto(f: Fila) {
  const atual = useRef(f);
  atual.current = f;
  const canal = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const instancia = useRef(Math.random().toString(36).slice(2, 10));

  const anunciar = useCallback(() => {
    const { fila, historico, pausado, segurado, atual: tocando } = atual.current;
    const payload: EstadoRemoto = {
      fila,
      historico,
      pausado,
      segurado,
      atual: tocando,
      instancia: instancia.current,
    };
    canal.current?.send({ type: 'broadcast', event: 'estado', payload });
  }, []);

  useEffect(() => {
    const c = supabase
      .channel(CANAL)
      .on('broadcast', { event: 'pedir' }, () => anunciar())
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerta_comandos' },
        (p: { new: { comando: string; alvo: string | null } }) => {
          const { comando, alvo } = p.new;
          const fila = atual.current;
          if (comando === 'tocar' && alvo) fila.tocar(alvo);
          else if (comando === 'remover' && alvo) fila.remover(alvo);
          else if (comando === 'pular') fila.pular();
          else if (comando === 'pausar') fila.pausar();
          else if (comando === 'retomar') fila.retomar();
        },
      );
    canal.current = c;
    c.subscribe((s: string) => {
      if (s === 'SUBSCRIBED') anunciar();
    });
    const t = setInterval(anunciar, ANUNCIO_MS);
    return () => {
      clearInterval(t);
      canal.current = null;
      supabase.removeChannel(c);
    };
  }, [anunciar]);

  // cada mudança: anuncia e guarda (o OBS recarrega a fonte e a fila continua)
  useEffect(() => {
    anunciar();
    try {
      localStorage.setItem(
        CHAVE_LOCAL,
        JSON.stringify({
          fila: f.fila,
          historico: f.historico,
          pausado: f.pausado,
        }),
      );
    } catch {
      // sem localStorage: a fila só não sobrevive à recarga
    }
  }, [f.versao, f.fila, f.historico, f.pausado, f.segurado, anunciar]);
}

/** No painel: a fila que a fonte do OBS anunciou e os comandos pra ela. */
export function usePlaylistAlertas() {
  const [estado, setEstado] = useState<EstadoRemoto | null>(null);
  const [vistoEm, setVistoEm] = useState(0);
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const c = supabase.channel(CANAL).on('broadcast', { event: 'estado' }, ({ payload }: { payload: EstadoRemoto }) => {
      setEstado(payload);
      const t = Date.now();
      setVistoEm(t);
      setAgora(t);
    });
    c.subscribe((s: string) => {
      // acabou de abrir: pede o estado em vez de esperar o próximo anúncio
      if (s === 'SUBSCRIBED') c.send({ type: 'broadcast', event: 'pedir', payload: {} });
    });
    const t = setInterval(() => setAgora(Date.now()), 3000);
    return () => {
      clearInterval(t);
      supabase.removeChannel(c);
    };
  }, []);

  const comando = useCallback(async (c: ComandoAlerta, alvo?: string): Promise<string | null> => {
    const { error } = await supabase.rpc('comando_alerta', {
      p_comando: c,
      p_alvo: alvo ?? null,
    });
    return error ? error.message : null;
  }, []);

  return {
    estado,
    online: vistoEm > 0 && agora - vistoEm < FORA_DO_AR_MS,
    comando,
  };
}
