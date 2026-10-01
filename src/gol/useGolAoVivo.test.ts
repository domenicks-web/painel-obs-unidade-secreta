import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { useGolAoVivo, type GolEvento } from './useGolAoVivo';

const T0 = 1_800_000_000_000;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});
afterEach(() => vi.useRealTimers());

const ev = (extra: Partial<GolEvento> = {}): GolEvento => ({ id: 'g1', lado: 'A', a: 1, b: 0, em: Date.now(), dur: 4, anim: true, ...extra });

function montar(inicial: GolEvento | null, offset = 0) {
  return renderHook(({ e }) => useGolAoVivo(e, offset), { initialProps: { e: inicial } });
}

describe('useGolAoVivo', () => {
  it('gol que já estava lá quando a fonte abriu não toca', () => {
    const { result } = montar(ev());
    expect(result.current.gol).toBeNull();
    expect(result.current.pulso).toBeNull();
  });

  it('gol novo toca pela duração: sai nos últimos 0,5 s; o placar pisca', () => {
    const h = montar(null);
    h.rerender({ e: ev() });
    expect(h.result.current.gol?.id).toBe('g1');
    expect(h.result.current.pulso).toEqual({ lado: 'A', id: 'g1' });
    act(() => vi.advanceTimersByTime(3500));
    expect(h.result.current.saindo).toBe(true);
    act(() => vi.advanceTimersByTime(500));
    expect(h.result.current.gol).toBeNull();
  });

  it('animação desligada: só pisca o número', () => {
    const h = montar(null);
    h.rerender({ e: ev({ anim: false }) });
    expect(h.result.current.gol).toBeNull();
    expect(h.result.current.pulso).toEqual({ lado: 'A', id: 'g1' });
  });

  it('gol antigo chegando atrasado (reconexão, outra aba) não toca', () => {
    const h = montar(null);
    h.rerender({ e: ev({ em: Date.now() - 5000 }) });
    expect(h.result.current.gol).toBeNull();
    expect(h.result.current.pulso).toBeNull();
  });

  it('usa o relógio do servidor: com o navegador atrasado, o gol de agora ainda toca', () => {
    const h = renderHook(({ e }) => useGolAoVivo(e, 60_000), { initialProps: { e: null as GolEvento | null } });
    h.rerender({ e: ev({ em: Date.now() + 60_000 }) });
    expect(h.result.current.gol?.id).toBe('g1');
  });

  it('chegou com um pouco de atraso: termina no mesmo horário que as outras fontes', () => {
    const h = montar(null);
    h.rerender({ e: ev({ em: Date.now() - 1000 }) });
    expect(h.result.current.gol?.id).toBe('g1');
    act(() => vi.advanceTimersByTime(3000));
    expect(h.result.current.gol).toBeNull();
  });

  it('anulado ("–" do mesmo time) corta na hora', () => {
    const h = montar(null);
    const e = ev();
    h.rerender({ e });
    act(() => vi.advanceTimersByTime(1000));
    h.rerender({ e: { ...e, anulado: true } });
    expect(h.result.current.gol).toBeNull();
  });

  it('dois "+" seguidos: reinicia com o placar novo, sem empilhar', () => {
    const h = montar(null);
    h.rerender({ e: ev() });
    act(() => vi.advanceTimersByTime(2000));
    h.rerender({ e: ev({ id: 'g2', a: 2 }) });
    expect(h.result.current.gol).toMatchObject({ id: 'g2', a: 2 });
    expect(h.result.current.saindo).toBe(false);
    act(() => vi.advanceTimersByTime(2000)); // o timer do primeiro não derruba o segundo
    expect(h.result.current.gol?.id).toBe('g2');
    act(() => vi.advanceTimersByTime(2000));
    expect(h.result.current.gol).toBeNull();
  });

  it('mesmo evento chegando de novo (eco, recarga do estado) não toca duas vezes', () => {
    const h = montar(null);
    const e = ev();
    h.rerender({ e });
    act(() => vi.advanceTimersByTime(4000));
    h.rerender({ e: { ...e } });
    expect(h.result.current.gol).toBeNull();
  });
});
