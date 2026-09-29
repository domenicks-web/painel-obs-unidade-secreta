import { useEffect, useRef, useState } from 'react';
import { Palco } from '../telas/Palco';
import { TELA_COMPONENTE } from '../telas';
import type { EstadoLive, TelaId } from '../live/tipos';

export function Previa({ tela, estado }: { tela: TelaId; estado: EstadoLive }) {
  const caixa = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(0);
  useEffect(() => {
    if (!caixa.current || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setLargura(e.contentRect.width));
    ro.observe(caixa.current);
    return () => ro.disconnect();
  }, []);
  const Tela = TELA_COMPONENTE[tela];
  return (
    <div ref={caixa} className="p-previa">
      {largura > 0 && (
        <Palco escala={largura / 1920}>
          <Tela estado={estado} previa />
        </Palco>
      )}
    </div>
  );
}
