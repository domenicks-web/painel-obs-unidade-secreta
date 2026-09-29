import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROXIMO_EM, SAIR_EM, useFilaAlertas } from './useFilaAlertas';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const a = (id: string) => ({ id, tipo: 'superchat' as const, nome: id, valor: 'R$ 5,00' });

describe('useFilaAlertas', () => {
  it('um por vez, na ordem, com saída aos 6,5 s', () => {
    const { result } = renderHook(() => useFilaAlertas());
    act(() => {
      result.current.adicionar(a('1'));
      result.current.adicionar(a('2'));
    });
    expect(result.current.atual?.id).toBe('1');
    expect(result.current.tamanho).toBe(1);
    act(() => vi.advanceTimersByTime(SAIR_EM));
    expect(result.current.saindo).toBe(true);
    act(() => vi.advanceTimersByTime(PROXIMO_EM - SAIR_EM));
    expect(result.current.atual?.id).toBe('2');
    expect(result.current.saindo).toBe(false);
    act(() => vi.advanceTimersByTime(PROXIMO_EM));
    expect(result.current.atual).toBeNull();
  });

  it('pausa o LivePix uma vez por sequência e retoma quando a fila esvazia', () => {
    const aoComecar = vi.fn();
    const aoTerminar = vi.fn();
    const { result } = renderHook(() => useFilaAlertas({ aoComecar, aoTerminar }));
    act(() => result.current.adicionar(a('1')));
    act(() => vi.advanceTimersByTime(3000));
    act(() => result.current.adicionar(a('2')));
    expect(aoComecar).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(PROXIMO_EM - 3000));
    expect(aoTerminar).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(PROXIMO_EM));
    expect(aoTerminar).toHaveBeenCalledTimes(1);
    // nova sequência depois: pausa de novo
    act(() => result.current.adicionar(a('3')));
    expect(aoComecar).toHaveBeenCalledTimes(2);
  });
});
