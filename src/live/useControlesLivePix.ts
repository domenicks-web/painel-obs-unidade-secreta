import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

// Controles do alerta do LivePix (o alerta em si é o widget do LivePix no OBS).
// Tudo passa por /api/livepix/*, no servidor, que guarda o client_secret.

export type StatusLivePix = 'carregando' | 'ativo' | 'pausado' | 'erro';

export interface ControlesLivePix {
  status: StatusLivePix;
  alternarPausa: () => Promise<boolean>;
  pular: () => Promise<boolean>;
  repetir: () => Promise<boolean>;
}

const CONFERIR_MS = 20_000; // alguém pode pausar em outro painel ou direto no LivePix

async function chamar(caminho: string, metodo: string, corpo?: unknown): Promise<Response | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return await fetch(`/api/livepix/${caminho}`, {
      method: metodo,
      headers: {
        authorization: `Bearer ${data.session?.access_token ?? ''}`,
        ...(corpo === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
  } catch {
    return null; // sem rede
  }
}

export function useControlesLivePix(): ControlesLivePix {
  const [autoPlay, setAutoPlay] = useState<boolean | null>(null);
  const [erro, setErro] = useState(false);
  const autoPlayRef = useRef<boolean | null>(null);
  autoPlayRef.current = autoPlay;

  const carregar = useCallback(async () => {
    const r = await chamar('controls', 'GET');
    if (!r?.ok) return setErro(true);
    const dados = (await r.json().catch(() => null)) as { autoPlay?: boolean } | null;
    if (typeof dados?.autoPlay !== 'boolean') return setErro(true);
    setAutoPlay(dados.autoPlay);
    setErro(false);
  }, []);

  useEffect(() => {
    carregar();
    const iv = setInterval(carregar, CONFERIR_MS);
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') carregar();
    };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => {
      clearInterval(iv);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, [carregar]);

  const alternarPausa = useCallback(async () => {
    // sem estado conhecido, trata como "tocando": o clique pausa
    const novo = !(autoPlayRef.current ?? true);
    const r = await chamar('controls', 'PATCH', { autoPlay: novo });
    if (!r?.ok) return false;
    setAutoPlay(novo);
    setErro(false);
    return true;
  }, []);

  const pular = useCallback(async () => !!(await chamar('skip', 'POST'))?.ok, []);
  const repetir = useCallback(async () => !!(await chamar('replay', 'POST'))?.ok, []);

  const status: StatusLivePix = autoPlay === null ? (erro ? 'erro' : 'carregando') : autoPlay ? 'ativo' : 'pausado';
  return { status, alternarPausa, pular, repetir };
}
