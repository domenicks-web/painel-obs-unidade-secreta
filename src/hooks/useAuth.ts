import { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Papel = 'admin' | 'editor' | null;

export function useAuth() {
  const [carregando, setCarregando] = useState(true);
  const [sessao, setSessao] = useState<Session | null>(null);
  const [papel, setPapel] = useState<Papel>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function resolverPapel(sessaoAtual: Session | null) {
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
