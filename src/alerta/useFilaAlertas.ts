import { useCallback, useEffect, useReducer, useRef } from 'react';

export interface Alerta {
  id: string;
  tipo: 'superchat' | 'sticker' | 'membro';
  nome: string;
  /** valor como veio ("US$ 10.00"); só superchat/sticker */
  valor?: string;
  msg?: string;
  /** muda a cada vez que toca: repetir o mesmo alerta seguido anima o cartão de novo */
  vez?: number;
}

export interface Tocado extends Alerta {
  tocadoEm: number;
}

/** O que a fonte do OBS guarda entre recargas e manda pro painel. */
export interface EstadoFila {
  fila: Alerta[];
  historico: Tocado[];
  pausado: boolean;
}

// Referência (Alerta YT): 0,5 s entrando, 6 s na tela, 0,5 s saindo; o próximo entra em seguida.
export const SAIR_EM = 6500;
export const PROXIMO_EM = 7000;
const SAIDA = PROXIMO_EM - SAIR_EM;
export const MAX_HISTORICO = 30;

const limpo = ({ id, tipo, nome, valor, msg }: Alerta): Alerta => ({ id, tipo, nome, valor, msg });

/**
 * Playlist dos alertas: toca um por vez na ordem de chegada, e o painel pode escolher o próximo,
 * tocar de novo um que já foi, tirar da fila, pular o atual e pausar a fila.
 * `aoComecar` roda quando começa uma sequência (antes do primeiro alerta) e `aoTerminar` quando
 * ela acaba: é onde o LivePix é pausado e retomado, uma vez só por sequência.
 */
export function useFilaAlertas(opcoes: { aoComecar?: () => void; aoTerminar?: () => void; inicial?: EstadoFila } = {}) {
  const [versao, mudou] = useReducer((n: number) => n + 1, 0);
  const s = useRef({
    fila: (opcoes.inicial?.fila ?? []).map(limpo),
    historico: opcoes.inicial?.historico ?? ([] as Tocado[]),
    pausado: opcoes.inicial?.pausado ?? false,
    atual: null as Alerta | null,
    saindo: false,
    tocando: false,
    vez: 0,
  });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cb = useRef(opcoes);
  cb.current = opcoes;

  const limparTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const proximo = useCallback(() => {
    const e = s.current;
    limparTimers();
    const [a, ...resto] = e.fila;
    if (a && !e.pausado) {
      e.fila = resto;
      iniciar(a);
    } else {
      e.atual = null;
      e.saindo = false;
      if (e.tocando) {
        e.tocando = false;
        cb.current.aoTerminar?.();
      }
    }
    mudou();
  }, []);

  function iniciar(a: Alerta) {
    const e = s.current;
    e.atual = { ...limpo(a), vez: ++e.vez };
    e.saindo = false;
    e.historico = [{ ...limpo(a), tocadoEm: Date.now() }, ...e.historico.filter((h) => h.id !== a.id)].slice(0, MAX_HISTORICO);
    timers.current = [
      setTimeout(() => {
        e.saindo = true;
        mudou();
      }, SAIR_EM),
      setTimeout(proximo, PROXIMO_EM),
    ];
  }

  // começa uma sequência com o primeiro da fila (sozinho = ignora a pausa: foi escolhido no painel)
  const comecar = useCallback((sozinho = false) => {
    const e = s.current;
    if (e.tocando || !e.fila.length || (e.pausado && !sozinho)) return;
    e.tocando = true;
    cb.current.aoComecar?.();
    const [a, ...resto] = e.fila;
    e.fila = resto;
    iniciar(a);
    mudou();
  }, []);

  const adicionar = useCallback(
    (a: Alerta) => {
      const e = s.current;
      if (e.atual?.id === a.id || e.fila.some((x) => x.id === a.id) || e.historico.some((x) => x.id === a.id)) return;
      e.fila = [...e.fila, limpo(a)];
      mudou();
      comecar();
    },
    [comecar],
  );

  /** Escolhido no painel: vira o próximo (sem cortar o atual); parado, toca na hora. */
  const tocar = useCallback(
    (id: string) => {
      const e = s.current;
      const a = e.fila.find((x) => x.id === id) ?? e.historico.find((x) => x.id === id) ?? (e.atual?.id === id ? e.atual : null);
      if (!a) return;
      e.fila = [limpo(a), ...e.fila.filter((x) => x.id !== id)];
      mudou();
      comecar(true);
    },
    [comecar],
  );

  const remover = useCallback((id: string) => {
    s.current.fila = s.current.fila.filter((x) => x.id !== id);
    mudou();
  }, []);

  const pular = useCallback(() => {
    const e = s.current;
    if (!e.atual || e.saindo) return;
    limparTimers();
    e.saindo = true;
    timers.current = [setTimeout(proximo, SAIDA)];
    mudou();
  }, [proximo]);

  const pausar = useCallback(() => {
    s.current.pausado = true;
    mudou();
  }, []);

  const retomar = useCallback(() => {
    s.current.pausado = false;
    mudou();
    comecar();
  }, [comecar]);

  // recarregou com fila e sem pausa: continua de onde parou
  useEffect(() => {
    comecar();
    return limparTimers;
  }, [comecar]);

  const e = s.current;
  return {
    atual: e.atual,
    saindo: e.saindo,
    tamanho: e.fila.length,
    fila: e.fila,
    historico: e.historico,
    pausado: e.pausado,
    /** sobe a cada mudança (pra quem precisa avisar o painel) */
    versao,
    adicionar,
    tocar,
    remover,
    pular,
    pausar,
    retomar,
  };
}
