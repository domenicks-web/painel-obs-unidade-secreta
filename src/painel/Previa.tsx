import { useEffect, useRef, useState } from 'react';
import { Palco } from '../telas/Palco';
import { TELA_COMPONENTE } from '../telas';
import type { EstadoLive, TelaId } from '../live/tipos';
import type { Camera } from '../telas/cameras';
import { ArrastarMolduras } from './ArrastarMolduras';
import { CamadaGol } from '../gol/CamadaGol';
import { ArrastarJogadores } from './ArrastarJogadores';
import type { TimeEscalado } from '../telas/TelaEscalacao';
import type { Ponto } from '../escalacao/layout';

export interface EditorJogadores {
  escalados: TimeEscalado[];
  aoMudar: (lado: 'casa' | 'visitante', pontos: Ponto[]) => void;
}

// editor: nas telas com câmera, as molduras podem ser arrastadas em cima da prévia
export function Previa({
  tela,
  estado,
  editor,
  jogadores,
}: {
  tela: TelaId;
  estado: EstadoLive;
  editor?: { lista: Camera[]; aoMudar: (l: Camera[]) => void };
  // ESCALAÇÃO no modo CAMPO com EDITAR POSIÇÕES ligado: arrasta as bolinhas no lugar das câmeras
  jogadores?: EditorJogadores;
}) {
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
      {largura > 0 && editor && !jogadores && <ArrastarMolduras lista={editor.lista} escala={largura / 1920} aoMudar={editor.aoMudar} />}
      {largura > 0 && jogadores && <ArrastarJogadores escalados={jogadores.escalados} escala={largura / 1920} aoMudar={jogadores.aoMudar} />}
      {/* gol por cima de tudo, como a fonte /gol no OBS (sem som na prévia) */}
      {largura > 0 && (tela === 'futebol' || tela === 'escalacao') && (
        <div className="p-previa__gol">
          <Palco escala={largura / 1920}>
            <CamadaGol estado={estado} comSom={false} />
          </Palco>
        </div>
      )}
    </div>
  );
}
