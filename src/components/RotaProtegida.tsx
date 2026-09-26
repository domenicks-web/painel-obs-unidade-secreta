import { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function RotaProtegida({ children }: PropsWithChildren) {
  const { carregando, sessao, papel } = useAuth();

  if (carregando) return <div className="tela-cheia">Carregando…</div>;
  if (!sessao) return <Navigate to="/login" replace />;
  if (!papel) return <div className="tela-cheia">Sua conta ainda não foi liberada pela equipe. Fala com um admin.</div>;

  return <>{children}</>;
}
