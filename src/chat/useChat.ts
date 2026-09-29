import { useCallback, useEffect, useState } from 'react';
import { normalizarSsn, urlSsn } from './ssn';
import type { MsgChat } from './tipos';

export type StatusChat = 'sem_sessao' | 'conectando' | 'ao_vivo' | 'reconectando' | 'teste';

const ESPERA_MIN = 1000;
const ESPERA_MAX = 10000;

/**
 * Escuta o chat do Social Stream Ninja pela sessão dada e guarda as últimas `max` mensagens.
 * Cai a conexão, tenta de novo (1 s, 2 s, 4 s… até 10 s). O servidor não guarda histórico:
 * quem conecta agora só vê o que chegar daqui pra frente.
 * `teste`: não conecta em nada, só aceita o que vier por `adicionar`.
 */
export function useChat({ sessao, max, teste = false }: { sessao: string; max: number; teste?: boolean }) {
  const [msgs, setMsgs] = useState<MsgChat[]>([]);
  const [conexao, setConexao] = useState<'conectando' | 'ao_vivo' | 'reconectando'>('conectando');

  const adicionar = useCallback(
    (m: MsgChat) =>
      setMsgs((atual) => (atual.some((x) => x.id === m.id) ? atual : [...atual, m].slice(-max))),
    [max],
  );
  const limpar = useCallback(() => setMsgs([]), []);

  useEffect(() => {
    if (teste || !sessao) return;
    let ativo = true;
    let ws: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let espera = ESPERA_MIN;
    setConexao('conectando');

    function conectar() {
      ws = new WebSocket(urlSsn(sessao));
      ws.onopen = () => {
        espera = ESPERA_MIN;
        setConexao('ao_vivo');
      };
      ws.onmessage = (e) => {
        let dado: unknown;
        try {
          dado = JSON.parse(String(e.data));
        } catch {
          return;
        }
        const m = normalizarSsn(dado);
        if (m) adicionar(m);
      };
      ws.onclose = () => {
        if (!ativo) return;
        setConexao('reconectando');
        timer = setTimeout(conectar, espera);
        espera = Math.min(espera * 2, ESPERA_MAX);
      };
    }

    conectar();
    return () => {
      ativo = false;
      clearTimeout(timer);
      ws?.close();
    };
  }, [sessao, teste, adicionar]);

  const status: StatusChat = teste ? 'teste' : !sessao ? 'sem_sessao' : conexao;
  return { msgs, status, adicionar, limpar };
}
