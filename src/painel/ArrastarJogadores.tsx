import { useRef } from 'react';
import { CAMPO, arrasteParaManual, centrosNoCampo, manuaisDaFormacao, type Ponto } from '../escalacao/layout';
import type { TimeEscalado } from '../telas/TelaEscalacao';

interface Props {
  escalados: TimeEscalado[];
  escala: number; // largura da prévia / 1920
  aoMudar: (lado: 'casa' | 'visitante', pontos: Ponto[]) => void;
}

interface Arraste {
  t: TimeEscalado;
  i: number;
  x0: number;
  y0: number;
  centro: Ponto;
  base: Ponto[];
}

// Camada por cima da prévia (modo CAMPO): arrastar a bolinha grava as 11 posições do time
// (0–1, de quem ataca pra direita). Sem posição manual ainda, começa da formação calculada.
export function ArrastarJogadores({ escalados, escala, aoMudar }: Props) {
  const arraste = useRef<Arraste | null>(null);
  const ambos = escalados.length === 2;

  function comecar(e: React.PointerEvent<HTMLElement>, t: TimeEscalado, i: number, centro: Ponto) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    arraste.current = { t, i, x0: e.clientX, y0: e.clientY, centro, base: t.manual ?? manuaisDaFormacao(t.formacao, ambos) };
  }

  function mover(e: React.PointerEvent<HTMLElement>) {
    const a = arraste.current;
    if (!a) return;
    const p = { x: a.centro.x + (e.clientX - a.x0) / escala, y: a.centro.y + (e.clientY - a.y0) / escala };
    const nova = a.base.map((q, j) => (j === a.i ? arrasteParaManual(p, ambos, a.t.lado) : q));
    aoMudar(a.t.lado, nova);
  }

  function soltar(e: React.PointerEvent<HTMLElement>) {
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    arraste.current = null;
  }

  return (
    <div className="p-arraste">
      {escalados.flatMap((t) => {
        const centros = centrosNoCampo(t.formacao, t.manual, ambos, t.lado);
        return t.jogadores.map((j, i) => {
          const c = centros[i];
          return (
            <div
              key={`${t.lado}-${i}`}
              role="button"
              tabIndex={-1}
              aria-label={`Mover ${j.numero} ${j.nome}`}
              className="p-arraste__jogador"
              style={{ left: `${(CAMPO.x + c.x) * escala}px`, top: `${(CAMPO.y + c.y) * escala}px`, width: `${46 * escala}px`, height: `${46 * escala}px` }}
              onPointerDown={(e) => comecar(e, t, i, c)}
              onPointerMove={mover}
              onPointerUp={soltar}
              onPointerCancel={soltar}
            />
          );
        });
      })}
    </div>
  );
}
