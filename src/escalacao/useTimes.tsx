import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { normalizarTime, type Jogador, type Time } from './times';

// Times cadastrados (tabelas times + jogadores). Um provider só por página: uma inscrição no
// Realtime, compartilhada pela tela e pelo painel. Qualquer mudança recarrega a lista inteira
// (são poucos times; o elenco é trocado inteiro numa transação).

const CHAVE_LOCAL = 'us-times';
const ESPERA_MS = 250;

interface ValorTimes {
  times: Time[];
  carregado: boolean;
  salvarTime: (t: Omit<Time, 'id'> & { id: string | null }) => Promise<string | null>;
  excluirTime: (id: string) => Promise<string | null>;
}

const Contexto = createContext<ValorTimes | null>(null);

function lerLocal(): Time[] | null {
  try {
    const bruto = localStorage.getItem(CHAVE_LOCAL);
    const lista = bruto ? JSON.parse(bruto) : null;
    return Array.isArray(lista) ? lista.map(normalizarTime) : null;
  } catch {
    return null;
  }
}

function gravarLocal(times: Time[]) {
  try {
    localStorage.setItem(CHAVE_LOCAL, JSON.stringify(times));
  } catch {
    // sem localStorage: a tela só não abre adiantada
  }
}

/** fixo: lista pronta (fixture/testes), sem Supabase. guardarLocal: fonte do OBS abre com a última lista. */
export function TimesProvider({ children, fixo, guardarLocal }: { children: ReactNode; fixo?: Time[]; guardarLocal?: boolean }) {
  const [times, setTimes] = useState<Time[]>(() => fixo ?? ((guardarLocal && lerLocal()) || []));
  const [carregado, setCarregado] = useState(!!fixo);

  useEffect(() => {
    if (fixo) return;
    let ativo = true;
    let pedido = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function carregar() {
      const meu = ++pedido;
      supabase
        .from('times')
        .select('id, nome, sigla, tecnico, cor, jogadores(numero, nome, titular, ordem)')
        .order('nome')
        .then(({ data, error }: { data: Parameters<typeof normalizarTime>[0][] | null; error: unknown }) => {
          if (!ativo || meu !== pedido || error || !data) return;
          const lista = data.map(normalizarTime);
          setTimes(lista);
          setCarregado(true);
          if (guardarLocal) gravarLocal(lista);
        });
    }
    // o elenco chega como vários eventos (apaga e insere): espera parar pra buscar uma vez
    const depois = () => {
      clearTimeout(timer);
      timer = setTimeout(carregar, ESPERA_MS);
    };
    carregar();

    const canal = supabase
      .channel(`times-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'times' }, depois)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jogadores' }, depois)
      .subscribe((s: string) => {
        if (s === 'SUBSCRIBED') carregar();
      });
    const aoVoltar = () => document.visibilityState === 'visible' && carregar();
    window.addEventListener('online', carregar);
    document.addEventListener('visibilitychange', aoVoltar);

    return () => {
      ativo = false;
      clearTimeout(timer);
      window.removeEventListener('online', carregar);
      document.removeEventListener('visibilitychange', aoVoltar);
      supabase.removeChannel(canal);
    };
  }, [fixo, guardarLocal]);

  const salvarTime = useCallback(
    async (t: Omit<Time, 'id'> & { id: string | null }) => {
      if (fixo) return null;
      const jogadores = t.jogadores.map(({ numero, nome, titular }: Jogador) => ({ numero, nome: nome.trim(), titular }));
      const { error } = await supabase.rpc('salvar_time', {
        p_id: t.id,
        p_nome: t.nome.trim(),
        p_sigla: t.sigla.trim(),
        p_tecnico: t.tecnico.trim(),
        p_cor: t.cor,
        p_jogadores: jogadores,
      });
      return error ? error.message : null;
    },
    [fixo],
  );

  const excluirTime = useCallback(
    async (id: string) => {
      if (fixo) return null;
      const { error } = await supabase.rpc('excluir_time', { p_id: id });
      return error ? error.message : null;
    },
    [fixo],
  );

  const valor = useMemo(() => ({ times, carregado, salvarTime, excluirTime }), [times, carregado, salvarTime, excluirTime]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

const VAZIO: ValorTimes = { times: [], carregado: false, salvarTime: async () => 'sem conexão', excluirTime: async () => 'sem conexão' };

export function useTimes(): ValorTimes {
  return useContext(Contexto) ?? VAZIO;
}
