import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { EventoAlerta } from '../types/estado';

interface LinhaEvento {
  tipo: string;
  payload: EventoAlerta;
  created_at: string;
}

export function useEventos(slug: string) {
  const [ultimoEvento, setUltimoEvento] = useState<EventoAlerta | null>(null);
  const [recebidoEm, setRecebidoEm] = useState<number | null>(null);

  useEffect(() => {
    const canal = supabase
      .channel(`eventos-${slug}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'eventos' }, (payload: { new: LinhaEvento }) => {
        if (payload.new.tipo !== 'doacao') return;
        setUltimoEvento(payload.new.payload);
        setRecebidoEm(Date.now());
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [slug]);

  const disparar = useCallback(
    async (evento: EventoAlerta) => {
      await supabase.rpc('disparar_evento', { p_slug: slug, p_tipo: 'doacao', p_payload: evento });
    },
    [slug],
  );

  return { ultimoEvento, recebidoEm, disparar };
}
