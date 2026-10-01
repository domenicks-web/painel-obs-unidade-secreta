import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { ESTADO_PADRAO } from '../live/tipos';
import { AnimacaoGol } from './AnimacaoGol';
import type { GolEvento } from './useGolAoVivo';

vi.mock('../live/relogioServidor', () => ({ useAgora: () => Date.now(), useOffsetServidor: () => 0 }));
import { TelaFutebol } from '../telas/TelaFutebol';

const gol = (extra: Partial<GolEvento> = {}): GolEvento => ({ id: 'g', lado: 'A', a: 2, b: 1, em: Date.now(), dur: 4, anim: true, ...extra });

describe('AnimacaoGol', () => {
  it('GOOOL letra por letra, "GOL DO" time que marcou e o placar novo', () => {
    const { container } = render(<AnimacaoGol gol={gol()} saindo={false} timeA="BRASIL" timeB="INDIA" />);
    const letras = [...container.querySelectorAll('span')].filter((s) => s.style.animation.startsWith('gStamp'));
    expect(letras.map((s) => s.textContent).join('')).toBe('GOOOL');
    expect(letras[4].style.animation).toContain('0.88s'); // 0,6 + 4 × 0,07
    expect(screen.getByText('GOL DO').parentElement!.textContent).toBe('GOL DOBRASIL');
    expect(container.textContent).toContain('2×1');
  });
  it('cor do time que marcou (visitante: violeta) e a barra dura a duração menos a saída', () => {
    const { container } = render(<AnimacaoGol gol={gol({ lado: 'B', dur: 5 })} saindo={false} timeA="BRASIL" timeB="INDIA" />);
    expect(screen.getByText('GOL DO').parentElement!.textContent).toBe('GOL DOINDIA');
    expect((container.querySelector('[style*="gFlash"]') as HTMLElement).style.background).toBe('rgb(139, 108, 240)');
    expect((container.querySelector('[style*="gBar"]') as HTMLElement).style.animation).toContain('4.5s');
  });
  it('saindo: wipe pra direita', () => {
    const { container } = render(<AnimacaoGol gol={gol()} saindo timeA="A" timeB="B" />);
    expect((container.firstElementChild as HTMLElement).style.animation).toContain('gOut');
  });
});

describe('placar do FUTEBOL', () => {
  it('gol novo: o número de quem marcou pisca (gPop), mesmo com a animação desligada', () => {
    const { container, rerender } = render(<TelaFutebol estado={{ ...ESTADO_PADRAO, golsB: 0 }} />);
    expect(container.querySelector('.g-pop')).toBeNull();
    act(() => rerender(<TelaFutebol estado={{ ...ESTADO_PADRAO, golsB: 1, golEvento: gol({ lado: 'B', a: 0, b: 1, anim: false }) }} />));
    const pop = container.querySelector('.g-pop');
    expect(pop?.textContent).toBe('1');
  });
});
