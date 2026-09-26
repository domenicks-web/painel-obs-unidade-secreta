import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const RESSINCRONIZAR_MS = 30_000;
const TICK_MS = 500;

export function useServerClock(): number {
  const [offset, setOffset] = useState(0);
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    let ativo = true;

    async function sincronizar() {
      const antes = Date.now();
      const { data, error } = await supabase.rpc('hora_servidor');
      const depois = Date.now();
      if (!ativo || error || !data) return;
      const latencia = (depois - antes) / 2;
      const servidorAgora = new Date(data as string).getTime() + latencia;
      setOffset(servidorAgora - depois);
    }

    sincronizar();
    const intervaloSync = setInterval(sincronizar, RESSINCRONIZAR_MS);
    const intervaloTick = setInterval(() => setAgora(Date.now()), TICK_MS);

    return () => {
      ativo = false;
      clearInterval(intervaloSync);
      clearInterval(intervaloTick);
    };
  }, []);

  return agora + offset;
}
