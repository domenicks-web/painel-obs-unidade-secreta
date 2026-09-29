import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';

const RESSINCRONIZAR_MS = 30_000;
const OffsetCtx = createContext(0);

export function RelogioServidorProvider({ fixo = false, children }: { fixo?: boolean; children: ReactNode }) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (fixo) return;
    let ativo = true;
    async function sincronizar() {
      const antes = Date.now();
      const { data, error } = await supabase.rpc('hora_servidor');
      const depois = Date.now();
      if (!ativo || error || !data) return;
      const servidor = new Date(data as string).getTime() + (depois - antes) / 2;
      setOffset(servidor - depois);
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
