import { useCallback, useEffect, useMemo, useRef } from 'react';

// Segura o LivePix enquanto os alertas (ou o gol) tocam. Conta quem está segurando: só pede pra
// pausar no primeiro e pra retomar quando o último solta. Os pedidos vão em fila (soltar nunca passa
// na frente de segurar). Sem chave, o alerta toca mas não mexe no LivePix.
export function useLivePixSeguro(chave: string) {
  const fila = useRef<Promise<unknown>>(Promise.resolve());
  const segurando = useRef(0);
  // o último pedido que de fato saiu foi "segurar" (o LivePix pode estar pausado por nós)
  const pausouNoServidor = useRef(false);
  const fechando = useRef(false);

  const pedir = useCallback(
    (acao: 'segurar' | 'soltar', aoSair = false) => {
      if (!chave) return;
      const enviar = (): Promise<unknown> => {
        // fechando a fonte: o que ainda estava na fila não sai mais (só o soltar de saída)
        if (fechando.current && !aoSair) return Promise.resolve();
        pausouNoServidor.current = acao === 'segurar';
        return fetch('/api/livepix/alerta', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-alerta-chave': chave },
          body: JSON.stringify({ acao }),
          keepalive: aoSair,
        }).catch(() => null);
      };
      fila.current = aoSair ? enviar() : fila.current.then(enviar);
    },
    [chave],
  );

  const segurar = useCallback(() => {
    if (++segurando.current === 1) pedir('segurar');
  }, [pedir]);
  const soltar = useCallback(() => {
    if (segurando.current === 0) return;
    if (--segurando.current === 0) pedir('soltar');
  }, [pedir]);

  // fechou a fonte no meio de um alerta: não deixa o LivePix preso
  useEffect(() => {
    const aoSair = () => {
      fechando.current = true;
      segurando.current = 0;
      // só retoma se o pedido de pausar chegou a sair; o que estava na fila é descartado
      if (pausouNoServidor.current) pedir('soltar', true);
    };
    window.addEventListener('pagehide', aoSair);
    return () => {
      window.removeEventListener('pagehide', aoSair);
      aoSair();
    };
  }, [pedir]);

  return useMemo(() => ({ segurar, soltar }), [segurar, soltar]);
}
