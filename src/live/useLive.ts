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
  // valores esperando os 400 ms pra ir ao banco (o que descarregar() manda de uma vez)
  const aguardando = useRef(new Map<string, unknown>());
  const ultimos = useRef(new Map<string, unknown>());

  const aplicar = useCallback((l: Linha) => {
    setServidor({ ...ESTADO_PADRAO, ...l.estado });
    setEditado({ por: l.updated_by_nome, em: l.updated_at });
  }, []);

  useEffect(() => {
    if (fixture) return;
    let ativo = true;
    let pedido = 0;

    // Busca a linha inteira no banco. Roda no início, a cada (re)inscrição do Realtime,
    // quando a internet volta e quando a página volta a ficar visível: o que mudou
    // enquanto a conexão estava fora não chega pelo Realtime.
    function carregar() {
      const meu = ++pedido;
      supabase
        .from('salas')
        .select('estado, updated_at, updated_by_nome')
        .eq('slug', SLUG)
        .single()
        .then(({ data, error }: { data: Linha | null; error: unknown }) => {
          if (!ativo || meu !== pedido) return; // chegou uma resposta mais nova
          if (error || !data) return setStatus('reconectando');
          aplicar(data);
          setStatus('ao_vivo');
        });
    }

    carregar();

    const canal = supabase
      .channel(`live-${SLUG}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'salas', filter: `slug=eq.${SLUG}` }, (p: { new: Linha }) => {
        aplicar(p.new);
        setStatus('ao_vivo');
      })
      .subscribe((s: string) => {
        if (!ativo) return;
        if (s === 'SUBSCRIBED') carregar();
        else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(s)) setStatus('reconectando');
      });

    const aoVoltar = () => {
      if (document.visibilityState === 'visible') carregar();
    };
    window.addEventListener('online', carregar);
    document.addEventListener('visibilitychange', aoVoltar);

    return () => {
      ativo = false;
      window.removeEventListener('online', carregar);
      document.removeEventListener('visibilitychange', aoVoltar);
      supabase.removeChannel(canal);
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
        aguardando.current.delete(k);
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
        aguardando.current.set(k, v);
        timers.current.set(
          k,
          setTimeout(() => {
            timers.current.delete(k);
            aguardando.current.delete(k);
            enviar({ [k]: v } as PatchLive);
          }, DEBOUNCE_MS),
        );
      }
    },
    [enviar, fixture],
  );

  // Manda na hora tudo o que ainda esperava os 400 ms: ao esconder/fechar a aba e ao sair do painel.
  const descarregar = useCallback(() => {
    if (aguardando.current.size === 0) return;
    const patch = Object.fromEntries(aguardando.current) as PatchLive;
    timers.current.forEach(clearTimeout);
    timers.current.clear();
    aguardando.current.clear();
    enviar(patch);
  }, [enviar]);

  useEffect(() => {
    if (fixture) return;
    const aoEsconder = () => {
      if (document.visibilityState === 'hidden') descarregar();
    };
    window.addEventListener('pagehide', descarregar);
    window.addEventListener('beforeunload', descarregar);
    document.addEventListener('visibilitychange', aoEsconder);
    return () => {
      window.removeEventListener('pagehide', descarregar);
      window.removeEventListener('beforeunload', descarregar);
      document.removeEventListener('visibilitychange', aoEsconder);
      descarregar();
    };
  }, [fixture, descarregar]);

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
