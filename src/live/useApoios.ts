import { useCallback, useEffect, useState } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { normalizarApoio, type Apoio } from './tipos';

const LIMITE = 100;

export function useApoios() {
  const [lista, setLista] = useState<Apoio[]>([]);

  useEffect(() => {
    let ativo = true;
    let pedido = 0;
    // no início, a cada (re)inscrição do Realtime e quando a internet volta:
    // PIX que chegaram com a conexão fora não vêm pelo Realtime
    function carregar() {
      const meu = ++pedido;
      supabase
        .from('apoios')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(LIMITE)
        .then(({ data }: { data: Apoio[] | null }) => {
          if (ativo && meu === pedido && data) setLista(data.map(normalizarApoio));
        });
    }
    carregar();

    const canal = supabase
      .channel('apoios-painel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'apoios' }, (p: RealtimePostgresChangesPayload<Apoio>) => {
        setLista((atual) => {
          if (p.eventType === 'INSERT') return [normalizarApoio(p.new), ...atual.filter((x) => x.id !== p.new.id)].slice(0, LIMITE);
          if (p.eventType === 'UPDATE') return atual.map((x) => (x.id === p.new.id ? normalizarApoio(p.new) : x));
          return atual.filter((x) => x.id !== p.old.id);
        });
      })
      .subscribe((st: string) => {
        if (st === 'SUBSCRIBED') carregar();
      });
    window.addEventListener('online', carregar);

    return () => {
      ativo = false;
      window.removeEventListener('online', carregar);
      supabase.removeChannel(canal);
    };
  }, []);

  const adicionarManual = useCallback(async (nome: string, valor: number, msg = '') => {
    const { error } = await supabase.rpc('adicionar_pix_manual', { p_nome: nome, p_valor: valor, p_msg: msg });
    return error ? error.message : null;
  }, []);

  const alternar = useCallback(async (id: string) => {
    await supabase.rpc('alternar_apoio', { p_id: id });
  }, []);

  return { lista, adicionarManual, alternar };
}
