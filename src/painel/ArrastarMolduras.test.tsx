import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ArrastarMolduras } from './ArrastarMolduras';
import type { Camera } from '../telas/cameras';

// jsdom não tem PointerEvent: o MouseEvent carrega clientX/clientY do mesmo jeito
beforeAll(() => {
  if (!('PointerEvent' in window)) (window as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent = MouseEvent;
});

const cam = (extra: Partial<Camera> = {}): Camera => ({ id: 'a', nome: 'ANA', formato: '16:9', w: 640, h: 360, x: 100, y: 800, ...extra });

function montar(lista: Camera[], escala = 0.5) {
  const aoMudar = vi.fn();
  render(<ArrastarMolduras lista={lista} escala={escala} aoMudar={aoMudar} />);
  return aoMudar;
}

describe('ArrastarMolduras', () => {
  it('desenha cada moldura na escala da prévia (X/Y no canto inferior esquerdo)', () => {
    montar([cam()]);
    const caixa = screen.getByRole('button', { name: 'Mover ANA' });
    expect(caixa.style.left).toBe('50px');
    expect(caixa.style.top).toBe('220px'); // (800 − 360) × 0,5
    expect(caixa.style.width).toBe('320px');
    expect(caixa.style.height).toBe('180px');
  });

  it('arrastar move a moldura (converte da escala da prévia pro palco)', () => {
    const aoMudar = montar([cam(), cam({ id: 'b', nome: 'BIA', x: 900 })]);
    const caixa = screen.getByRole('button', { name: 'Mover ANA' });
    fireEvent.pointerDown(caixa, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerMove(caixa, { clientX: 150, clientY: 80 });
    fireEvent.pointerUp(caixa, { clientX: 150, clientY: 80 });
    const lista = aoMudar.mock.calls.at(-1)![0] as Camera[];
    expect(lista[0]).toMatchObject({ x: 200, y: 760, w: 640, h: 360 });
    expect(lista[1]).toMatchObject({ x: 900 }); // a outra não mexe
  });

  it('alça do canto de cima à direita: cresce pra cima e pra direita, canto de baixo fica', () => {
    const aoMudar = montar([cam()]);
    const alca = screen.getByRole('button', { name: 'Redimensionar ANA' });
    fireEvent.pointerDown(alca, { clientX: 0, clientY: 0, button: 0 });
    fireEvent.pointerMove(alca, { clientX: 160, clientY: -90 });
    const c = (aoMudar.mock.calls.at(-1)![0] as Camera[])[0];
    expect(c).toMatchObject({ x: 100, y: 800, w: 960, h: 540 }); // 16:9 travado
  });

  it('formato livre: largura e altura independentes', () => {
    const aoMudar = montar([cam({ formato: 'livre' })]);
    const alca = screen.getByRole('button', { name: 'Redimensionar ANA' });
    fireEvent.pointerDown(alca, { clientX: 0, clientY: 0, button: 0 });
    fireEvent.pointerMove(alca, { clientX: 50, clientY: -100 });
    expect((aoMudar.mock.calls.at(-1)![0] as Camera[])[0]).toMatchObject({ w: 740, h: 560 });
  });

  it('sem apertar, mover o mouse não muda nada', () => {
    const aoMudar = montar([cam()]);
    fireEvent.pointerMove(screen.getByRole('button', { name: 'Mover ANA' }), { clientX: 300, clientY: 300 });
    expect(aoMudar).not.toHaveBeenCalled();
  });
});
