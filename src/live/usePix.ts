import { useCallback, useEffect, useState } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { normalizarPix, type Pix } from './tipos';

const LIMITE = 100;

export function usePix() {
  const [lista, setLista] = useState<Pix[]>([]);

  useEffect(() => {
    let ativo = true;
    supabase
      .from('pix')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(LIMITE)
      .then(({ data }: { data: Pix[] | null }) => {
        if (ativo && data) setLista(data.map(normalizarPix));
      });

    const canal = supabase
      .channel('pix-painel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pix' }, (p: RealtimePostgresChangesPayload<Pix>) => {
        setLista((atual) => {
          if (p.eventType === 'INSERT') return [normalizarPix(p.new), ...atual.filter((x) => x.id !== p.new.id)].slice(0, LIMITE);
          if (p.eventType === 'UPDATE') return atual.map((x) => (x.id === p.new.id ? normalizarPix(p.new) : x));
          return atual.filter((x) => x.id !== p.old.id);
        });
      })
      .subscribe();

    return () => {
      ativo = false;
      supabase.removeChannel(canal);
    };
  }, []);

  const adicionarManual = useCallback(async (nome: string, valor: number, msg = '') => {
    const { error } = await supabase.rpc('adicionar_pix_manual', { p_nome: nome, p_valor: valor, p_msg: msg });
    return error ? error.message : null;
  }, []);

  const alternar = useCallback(async (id: string) => {
    await supabase.rpc('alternar_pix', { p_id: id });
  }, []);

  return { lista, adicionarManual, alternar };
}
