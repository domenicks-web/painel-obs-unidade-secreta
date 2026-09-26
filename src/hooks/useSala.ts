import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Estado, ESTADO_PADRAO } from '../types/estado';

interface SalaInfo {
  id: string;
  estado: Estado;
  updatedAt: string;
  updatedByNome: string | null;
}

export type StatusConexao = 'conectando' | 'ao_vivo' | 'reconectando';

function chaveCache(slug: string) {
  return `us-obs-cache-${slug}`;
}

function lerCache(slug: string): SalaInfo | null {
  try {
    const raw = localStorage.getItem(chaveCache(slug));
    return raw ? (JSON.parse(raw) as SalaInfo) : null;
  } catch {
    return null;
  }
}

function salvarCache(slug: string, info: SalaInfo) {
  try {
    localStorage.setItem(chaveCache(slug), JSON.stringify(info));
  } catch {
    // armazenamento indisponível (ex.: modo privado) — segue sem cache
  }
}

interface LinhaSala {
  id: string;
  estado: Estado;
  updated_at: string;
  updated_by_nome: string | null;
}

function paraInfo(linha: LinhaSala): SalaInfo {
  return {
    id: linha.id,
    estado: { ...ESTADO_PADRAO, ...linha.estado },
    updatedAt: linha.updated_at,
    updatedByNome: linha.updated_by_nome,
  };
}

export function useSala(slug: string) {
  const cacheInicial = lerCache(slug);
  const [sala, setSala] = useState<SalaInfo | null>(cacheInicial);
  const [status, setStatus] = useState<StatusConexao>('conectando');
  const slugRef = useRef(slug);
  slugRef.current = slug;
  const carregouRef = useRef(false);

  useEffect(() => {
    let ativo = true;
    carregouRef.current = false;

    async function carregar() {
      const { data, error } = await supabase
        .from('salas')
        .select('id, estado, updated_at, updated_by_nome')
        .eq('slug', slug)
        .single();
      if (!ativo) return;
      if (error || !data) {
        setStatus((atual) => (atual === 'ao_vivo' ? atual : 'reconectando'));
        return;
      }
      const info = paraInfo(data as LinhaSala);
      setSala(info);
      salvarCache(slug, info);
      carregouRef.current = true;
      setStatus('ao_vivo');
    }

    carregar();

    const canal = supabase
      .channel(`sala-${slug}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'salas', filter: `slug=eq.${slug}` },
        (payload: { new: LinhaSala }) => {
          const info = paraInfo(payload.new);
          setSala(info);
          salvarCache(slug, info);
          carregouRef.current = true;
          setStatus('ao_vivo');
        },
      )
      .subscribe((statusCanal: string) => {
        if (!ativo) return;
        // Só refletimos SUBSCRIBED como "ao_vivo" depois que os dados iniciais
        // já chegaram — o canal pode confirmar a inscrição antes da resposta
        // do fetch inicial, e não queremos marcar "ao_vivo" enquanto o estado
        // exibido ainda é o padrão/cache.
        if (statusCanal === 'SUBSCRIBED' && carregouRef.current) setStatus('ao_vivo');
        else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(statusCanal)) {
          setStatus('reconectando');
        }
      });

    return () => {
      ativo = false;
      supabase.removeChannel(canal);
    };
  }, [slug]);

  const atualizar = useCallback(async (patch: Partial<Estado>) => {
    setSala((atual) => (atual ? { ...atual, estado: { ...atual.estado, ...patch } } : atual));
    const { error } = await supabase.rpc('atualizar_estado', { p_slug: slugRef.current, p_patch: patch });
    if (error) setStatus('reconectando');
  }, []);

  return {
    estado: sala?.estado ?? ESTADO_PADRAO,
    updatedAt: sala?.updatedAt,
    updatedByNome: sala?.updatedByNome,
    status,
    atualizar,
  };
}
