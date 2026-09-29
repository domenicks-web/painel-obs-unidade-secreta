import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

// Controles do alerta do LivePix (o alerta em si é o widget do LivePix no OBS).
// Os comandos passam por /api/livepix/<comando>, no servidor, que guarda os links.
// Os links não dizem se o alerta está pausado: o estado mostrado é o último comando
// registrado no banco (livepix_controle), igual pra toda a equipe via Realtime.

export type ComandoLivePix = 'pausar' | 'retomar' | 'pular' | 'repetir' | 'limpar';
export type StatusLivePix = 'carregando' | 'ativo' | 'pausado' | 'erro';

export interface UltimoComando {
  comando: ComandoLivePix;
  por: string | null;
  em: string;
}

export interface ControlesLivePix {
  status: StatusLivePix;
  ultimo: UltimoComando | null;
  alternarPausa: () => Promise<boolean>;
  pular: () => Promise<boolean>;
  repetir: () => Promise<boolean>;
  limpar: () => Promise<boolean>;
}

interface Linha {
  pausado: boolean;
  ultimo_comando: ComandoLivePix | null;
  por_nome: string | null;
  em: string | null;
}

async function chamar(comando: ComandoLivePix): Promise<Response | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return await fetch(`/api/livepix/${comando}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${data.session?.access_token ?? ''}` },
    });
  } catch {
    return null; // sem rede
  }
}

export function useControlesLivePix(): ControlesLivePix {
  const [linha, setLinha] = useState<Linha | null>(null);
  const [erro, setErro] = useState(false);
  const linhaRef = useRef<Linha | null>(null);

  // Só aceita uma linha tão nova quanto a atual: o eco do Realtime de um clique
  // anterior não desfaz o que a resposta do clique seguinte já mostrou.
  const aplicar = useCallback((l: Linha) => {
    const atual = linhaRef.current;
    if (atual?.em && l.em && Date.parse(l.em) < Date.parse(atual.em)) return;
    linhaRef.current = l;
    setLinha(l);
    setErro(false);
  }, []);

  useEffect(() => {
    let ativo = true;

    function carregar() {
      supabase
        .from('livepix_controle')
        .select('pausado, ultimo_comando, por_nome, em')
        .eq('id', 1)
        .maybeSingle()
        .then(({ data, error }: { data: Linha | null; error: unknown }) => {
          if (!ativo) return;
          if (error || !data) return setErro(true);
          aplicar(data);
        });
    }

    carregar();

    const canal = supabase
      .channel('livepix-controle')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'livepix_controle' }, (p: { new: Linha }) => aplicar(p.new))
      .subscribe((s: string) => {
        if (ativo && s === 'SUBSCRIBED') carregar();
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
  }, [aplicar]);

  const executar = useCallback(
    async (comando: ComandoLivePix) => {
      const r = await chamar(comando);
      if (!r?.ok) return false;
      const corpo = (await r.json().catch(() => null)) as { estado?: Linha | null } | null;
      if (corpo?.estado) aplicar(corpo.estado);
      return true;
    },
    [aplicar],
  );

  // sem estado conhecido, trata como "tocando": o clique pausa
  const alternarPausa = useCallback(() => executar(linhaRef.current?.pausado ? 'retomar' : 'pausar'), [executar]);
  const pular = useCallback(() => executar('pular'), [executar]);
  const repetir = useCallback(() => executar('repetir'), [executar]);
  const limpar = useCallback(() => executar('limpar'), [executar]);

  const status: StatusLivePix = linha === null ? (erro ? 'erro' : 'carregando') : linha.pausado ? 'pausado' : 'ativo';
  const ultimo = linha?.ultimo_comando && linha.em ? { comando: linha.ultimo_comando, por: linha.por_nome, em: linha.em } : null;
  return { status, ultimo, alternarPausa, pular, repetir, limpar };
}
