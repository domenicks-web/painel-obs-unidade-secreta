import { useEffect, useRef, useState } from 'react';
import { Palco } from '../telas/Palco';
import { TELA_COMPONENTE } from '../telas';
import type { EstadoLive, TelaId } from '../live/tipos';
import type { Camera } from '../telas/cameras';
import { ArrastarMolduras } from './ArrastarMolduras';
import { CamadaGol } from '../gol/CamadaGol';

// editor: nas telas com câmera, as molduras podem ser arrastadas em cima da prévia
export function Previa({ tela, estado, editor }: { tela: TelaId; estado: EstadoLive; editor?: { lista: Camera[]; aoMudar: (l: Camera[]) => void } }) {
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
          {tela === 'futebol' && <CamadaGol estado={estado} comSom={false} />}
        </Palco>
      )}
      {largura > 0 && editor && <ArrastarMolduras lista={editor.lista} escala={largura / 1920} aoMudar={editor.aoMudar} />}
    </div>
  );
}
