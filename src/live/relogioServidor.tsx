import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';

const RESSINCRONIZAR_MS = 30_000;
const OffsetCtx = createContext(0);
// a última diferença medida fica guardada: relógios e contagens abrem certos antes da rede responder
const CHAVE_LOCAL = 'us-relogio-offset';

function lerOffset(): number {
  try {
    const v = Number(localStorage.getItem(CHAVE_LOCAL));
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}

export function RelogioServidorProvider({ fixo = false, children }: { fixo?: boolean; children: ReactNode }) {
  const [offset, setOffset] = useState(() => (fixo ? 0 : lerOffset()));

  useEffect(() => {
    if (fixo) return;
    let ativo = true;
    async function sincronizar() {
      const antes = Date.now();
      const { data, error } = await supabase.rpc('hora_servidor');
      const depois = Date.now();
      if (!ativo || error || !data) return;
      const servidor = new Date(data as string).getTime() + (depois - antes) / 2;
      const novo = Math.round(servidor - depois);
      setOffset(novo);
      try {
        localStorage.setItem(CHAVE_LOCAL, String(novo));
      } catch {
        // sem localStorage: só não abre adiantado
      }
    }
    sincronizar();
    const iv = setInterval(sincronizar, RESSINCRONIZAR_MS);
    return () => {
      ativo = false;
      clearInterval(iv);
    };
  }, [fixo]);

  return <OffsetCtx.Provider value={offset}>{children}</OffsetCtx.Provider>;
}

export function useAgora(tickMs = 1000): number {
  const offset = useContext(OffsetCtx);
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setAgora(Date.now()), tickMs);
    return () => clearInterval(iv);
  }, [tickMs]);
  return agora + offset;
}
