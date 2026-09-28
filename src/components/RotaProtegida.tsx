import { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function RotaProtegida({ children }: PropsWithChildren) {
  const { carregando, sessao, papel, erro } = useAuth();

  if (carregando) return <div className="tela-cheia">Carregando…</div>;
  if (!sessao) return <Navigate to="/login" replace />;
  if (erro) return <div className="tela-cheia">Não deu pra verificar seu acesso ({erro}). Recarrega a página; se continuar, fala com um admin.</div>;
  if (!papel) return <div className="tela-cheia">Sua conta ainda não foi liberada pela equipe. Fala com um admin.</div>;

  return <>{children}</>;
}
