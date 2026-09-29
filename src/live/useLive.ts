import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { aplicarPatch, ESTADO_PADRAO, type EstadoLive, type PatchLive } from './tipos';

export const SLUG = 'principal';
const DEBOUNCE_MS = 400;

export type StatusConexao = 'conectando' | 'ao_vivo' | 'reconectando';

interface Linha {
  estado: Partial<EstadoLive>;
  updated_at: string;
  updated_by_nome: string | null;
}

export function useLive(opcoes: { fixture?: EstadoLive } = {}) {
  const { fixture } = opcoes;
  const [servidor, setServidor] = useState<EstadoLive>(fixture ?? ESTADO_PADRAO);
  const [editado, setEditado] = useState<{ por: string | null; em: string | null }>({ por: null, em: null });
  const [status, setStatus] = useState<StatusConexao>(fixture ? 'ao_vivo' : 'conectando');
  // valores locais ainda não confirmados: sobrepõem o eco do Realtime
  const [pendentes, setPendentes] = useState<PatchLive>({});
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const ultimos = useRef(new Map<string, unknown>());

  const aplicar = useCallback((l: Linha) => {
    setServidor({ ...ESTADO_PADRAO, ...l.estado });
    setEditado({ por: l.updated_by_nome, em: l.updated_at });
  }, []);

  useEffect(() => {
    if (fixture) return;
    let ativo = true;
    let carregou = false;
    const pendentesTimers = timers.current;

    supabase
      .from('salas')
      .select('estado, updated_at, updated_by_nome')
      .eq('slug', SLUG)
      .single()
      .then(({ data, error }: { data: Linha | null; error: unknown }) => {
        if (!ativo) return;
        if (error || !data) return setStatus('reconectando');
        aplicar(data);
        carregou = true;
        setStatus('ao_vivo');
      });

    const canal = supabase
      .channel(`live-${SLUG}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'salas', filter: `slug=eq.${SLUG}` }, (p: { new: Linha }) => {
        aplicar(p.new);
        carregou = true;
        setStatus('ao_vivo');
      })
      .subscribe((s: string) => {
        if (!ativo) return;
        if (s === 'SUBSCRIBED' && carregou) setStatus('ao_vivo');
        else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(s)) setStatus('reconectando');
      });

    return () => {
      ativo = false;
      supabase.removeChannel(canal);
      pendentesTimers.forEach(clearTimeout);
    };
  }, [fixture, aplicar]);

  const enviar = useCallback(
    async (patch: PatchLive) => {
      const { data, error } = await supabase.rpc('atualizar_estado', { p_slug: SLUG, p_patch: patch });
      if (error) setStatus('reconectando');
      // a resposta já traz o estado gravado: evita piscar o valor velho até o eco chegar
      else if (data) aplicar(data as Linha);
      // libera os campos cujo valor confirmado é o último digitado
      setPendentes((p) => {
        const novo = { ...p } as Record<string, unknown>;
        for (const [k, v] of Object.entries(patch)) if (ultimos.current.get(k) === v) delete novo[k];
        return novo as PatchLive;
      });
    },
    [aplicar],
  );

  const salvar = useCallback(
    async (patch: PatchLive) => {
      for (const [k, v] of Object.entries(patch)) {
        ultimos.current.set(k, v);
        // um clique vale mais que o texto ainda não enviado do mesmo campo
        clearTimeout(timers.current.get(k));
        timers.current.delete(k);
      }
      setPendentes((p) => ({ ...p, ...patch }));
      if (fixture) return;
      await enviar(patch);
    },
    [enviar, fixture],
  );

  const salvarDepois = useCallback(
    (patch: PatchLive) => {
      setPendentes((p) => ({ ...p, ...patch }));
      for (const [k, v] of Object.entries(patch)) {
        ultimos.current.set(k, v);
        clearTimeout(timers.current.get(k));
        if (fixture) continue;
        timers.current.set(
          k,
          setTimeout(() => {
            timers.current.delete(k);
            enviar({ [k]: v } as PatchLive);
          }, DEBOUNCE_MS),
        );
      }
    },
    [enviar, fixture],
  );

  const reiniciarContagem = useCallback(async () => {
    const { error } = await supabase.rpc('reiniciar_contagem', { p_slug: SLUG });
    if (error) setStatus('reconectando');
  }, []);

  const relogio = useCallback(async (acao: 'iniciar' | 'pausar' | 'zerar') => {
    const { error } = await supabase.rpc('controlar_relogio', { p_slug: SLUG, p_acao: acao });
    if (error) setStatus('reconectando');
  }, []);

  return {
    estado: aplicarPatch(servidor, pendentes),
    status,
    editadoPor: editado.por,
    editadoEm: editado.em,
    salvar,
    salvarDepois,
    reiniciarContagem,
    relogio,
  };
}
