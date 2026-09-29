import { Session } from '@supabase/supabase-js';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

type Papel = 'admin' | 'editor' | null;

export function useAuth() {
  const [carregando, setCarregando] = useState(true);
  const [sessao, setSessao] = useState<Session | null>(null);
  const [papel, setPapel] = useState<Papel>(null);
  const [erro, setErro] = useState<string | null>(null);
  // usuário cujo papel já foi resolvido (undefined = ainda não resolveu nada)
  const usuarioResolvido = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    let ativo = true;

    async function resolverPapel(sessaoAtual: Session | null) {
      usuarioResolvido.current = sessaoAtual?.user.id ?? null;
      if (!sessaoAtual) {
        if (ativo) {
          setSessao(null);
          setPapel(null);
          setErro(null);
          setCarregando(false);
        }
        return;
      }
      const { data, error } = await supabase.from('membros_equipe').select('papel').eq('user_id', sessaoAtual.user.id).maybeSingle();
      if (!ativo) return;
      setSessao(sessaoAtual);
      setPapel((data?.papel as Papel) ?? null);
      setErro(error ? error.message : null);
      setCarregando(false);
    }

    supabase.auth.getSession().then(({ data }) => resolverPapel(data.session));

    const { data: assinatura } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      // O Supabase avisa de novo ao renovar o token e quando a aba volta a ter foco.
      // Mesmo usuário: só guarda a sessão nova. Voltar pra "carregando" desmontaria o
      // painel no meio da live (perde a tela escolhida, o foco do campo, o modal aberto).
      if (novaSessao && novaSessao.user.id === usuarioResolvido.current) {
        setSessao(novaSessao);
        return;
      }
      setCarregando(true);
      resolverPapel(novaSessao);
    });

    return () => {
      ativo = false;
      assinatura.subscription.unsubscribe();
    };
  }, []);

  return { carregando, sessao, papel, erro };
}
