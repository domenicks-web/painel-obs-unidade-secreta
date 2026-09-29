import { useCallback, useEffect, useRef, useState } from 'react';

export interface Alerta {
  id: string;
  tipo: 'superchat' | 'sticker' | 'membro';
  nome: string;
  /** valor como veio ("US$ 10.00"); só superchat/sticker */
  valor?: string;
  msg?: string;
}

// Referência (Alerta YT): 0,5 s entrando, 6 s na tela, 0,5 s saindo; o próximo entra em seguida.
export const SAIR_EM = 6500;
export const PROXIMO_EM = 7000;

/**
 * Um alerta por vez, na ordem de chegada. `aoComecar` roda quando a fila sai do vazio (antes do
 * primeiro alerta) e `aoTerminar` quando o último termina de sair: é onde o LivePix é pausado e
 * retomado, uma vez só por sequência de alertas.
 */
export function useFilaAlertas(opcoes: { aoComecar?: () => void; aoTerminar?: () => void } = {}) {
  const [atual, setAtual] = useState<Alerta | null>(null);
  const [saindo, setSaindo] = useState(false);
  const [tamanho, setTamanho] = useState(0);
  const fila = useRef<Alerta[]>([]);
  const tocando = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cb = useRef(opcoes);
  cb.current = opcoes;

  const proximo = useCallback(() => {
    const a = fila.current.shift();
    setTamanho(fila.current.length);
    if (!a) {
      tocando.current = false;
      setAtual(null);
      setSaindo(false);
      cb.current.aoTerminar?.();
      return;
    }
    setAtual(a);
    setSaindo(false);
    timers.current = [setTimeout(() => setSaindo(true), SAIR_EM), setTimeout(proximo, PROXIMO_EM)];
  }, []);

  const adicionar = useCallback(
    (a: Alerta) => {
      fila.current.push(a);
      setTamanho(fila.current.length);
      if (tocando.current) return;
      tocando.current = true;
      cb.current.aoComecar?.();
      proximo();
    },
    [proximo],
  );

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  return { atual, saindo, tamanho, adicionar };
}
