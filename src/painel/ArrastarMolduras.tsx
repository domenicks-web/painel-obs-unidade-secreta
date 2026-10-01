import { useRef } from 'react';
import { mudarPosicao, mudarTamanho, type Camera } from '../telas/cameras';

interface Props {
  lista: Camera[];
  escala: number; // largura da prévia / 1920
  aoMudar: (lista: Camera[]) => void;
}

interface Arraste {
  modo: 'mover' | 'tamanho';
  i: number;
  x0: number;
  y0: number;
  cam: Camera;
}

// Camada por cima da prévia: arrastar a moldura move; a alça do canto de cima à direita muda o
// tamanho (o canto de baixo à esquerda, que é o X/Y, fica parado, igual aos campos).
export function ArrastarMolduras({ lista, escala, aoMudar }: Props) {
  const arraste = useRef<Arraste | null>(null);

  function comecar(e: React.PointerEvent<HTMLElement>, modo: Arraste['modo'], i: number) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    arraste.current = { modo, i, x0: e.clientX, y0: e.clientY, cam: lista[i] };
  }

  function mover(e: React.PointerEvent<HTMLElement>) {
    const a = arraste.current;
    if (!a) return;
    const dx = (e.clientX - a.x0) / escala;
    const dy = (e.clientY - a.y0) / escala;
    const c = a.cam;
    const nova =
      a.modo === 'mover'
        ? mudarPosicao(c, c.x + dx, c.y + dy)
        : mudarTamanho(c, c.formato === 'livre' ? { w: c.w + dx, h: c.h - dy } : { w: c.w + dx });
    aoMudar(lista.map((x, j) => (j === a.i ? nova : x)));
  }

  function soltar(e: React.PointerEvent<HTMLElement>) {
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    arraste.current = null;
  }

  return (
    <div className="p-arraste">
      {lista.map((c, i) => {
        const nome = c.nome || `câmera ${i + 1}`;
        const eventos = { onPointerMove: mover, onPointerUp: soltar, onPointerCancel: soltar };
        return (
          <div key={c.id}>
            <div
              role="button"
              tabIndex={-1}
              aria-label={`Mover ${nome}`}
              className="p-arraste__moldura"
              style={{ left: `${c.x * escala}px`, top: `${(c.y - c.h) * escala}px`, width: `${c.w * escala}px`, height: `${c.h * escala}px` }}
              onPointerDown={(e) => comecar(e, 'mover', i)}
              {...eventos}
            />
            <div
              role="button"
              tabIndex={-1}
              aria-label={`Redimensionar ${nome}`}
              className="p-arraste__alca"
              style={{ left: `${(c.x + c.w) * escala}px`, top: `${(c.y - c.h) * escala}px` }}
              onPointerDown={(e) => comecar(e, 'tamanho', i)}
              {...eventos}
            />
          </div>
        );
      })}
    </div>
  );
}
