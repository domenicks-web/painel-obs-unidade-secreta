import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useLivePixSeguro } from './livepixSeguro';

let fetchMock: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
});
afterEach(() => vi.restoreAllMocks());

const acoes = async () => {
  await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
  return fetchMock.mock.calls.map((c: unknown[]) => JSON.parse(String((c[1] as RequestInit).body)).acao);
};

describe('useLivePixSeguro', () => {
  it('alerta e gol ao mesmo tempo: pausa uma vez e só retoma quando os dois soltam', async () => {
    const { result } = renderHook(() => useLivePixSeguro('k'));
    act(() => result.current.segurar()); // alertas
    act(() => result.current.segurar()); // gol
    act(() => result.current.soltar()); // alertas acabaram, gol ainda na tela
    expect(await acoes()).toEqual(['segurar']);
    act(() => result.current.soltar());
    expect(await acoes()).toEqual(['segurar', 'soltar']);
  });
  it('soltar a mais não manda nada; objeto estável entre renders', async () => {
    const { result, rerender } = renderHook(() => useLivePixSeguro('k'));
    const antes = result.current;
    rerender();
    expect(result.current).toBe(antes);
    act(() => result.current.soltar());
    expect(await acoes()).toEqual([]);
  });
  it('fechou a fonte segurando: retoma', async () => {
    const { result, unmount } = renderHook(() => useLivePixSeguro('k'));
    act(() => result.current.segurar());
    expect(await acoes()).toEqual(['segurar']);
    unmount();
    expect(await acoes()).toEqual(['segurar', 'soltar']);
  });
  it('fechou antes do pausar sair: não pausa nem retoma (o LivePix não fica preso)', async () => {
    const { result, unmount } = renderHook(() => useLivePixSeguro('k'));
    act(() => result.current.segurar());
    unmount();
    expect(await acoes()).toEqual([]);
  });
  it('sem chave não mexe no LivePix', async () => {
    const { result } = renderHook(() => useLivePixSeguro(''));
    act(() => result.current.segurar());
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
