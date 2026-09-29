import { useEffect, type ReactNode } from 'react';
import './telas.css';

export function Palco({ escala = 1, children }: { escala?: number; children: ReactNode }) {
  return (
    <div className="us-palco" style={escala === 1 ? undefined : { transform: `scale(${escala})` }}>
      {children}
    </div>
  );
}

export function usarFundoTransparente() {
  useEffect(() => {
    const alvos = [document.documentElement, document.body, document.getElementById('root')].filter(Boolean) as HTMLElement[];
    const antes = alvos.map((el) => el.style.background);
    alvos.forEach((el) => (el.style.background = 'transparent'));
    return () => alvos.forEach((el, i) => (el.style.background = antes[i]));
  }, []);
}
