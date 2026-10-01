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

describe('useFilaAlertas · playlist', () => {
  function tocarTres() {
    const aoComecar = vi.fn();
    const aoTerminar = vi.fn();
    const h = renderHook(() => useFilaAlertas({ aoComecar, aoTerminar }));
    act(() => ['1', '2', '3'].forEach((id) => h.result.current.adicionar(a(id))));
    return { ...h, aoComecar, aoTerminar };
  }

  it('mostra a fila e guarda o que já tocou (mais recente primeiro)', () => {
    const { result } = tocarTres();
    expect(result.current.fila.map((x) => x.id)).toEqual(['2', '3']);
    act(() => vi.advanceTimersByTime(PROXIMO_EM));
    expect(result.current.atual?.id).toBe('2');
    expect(result.current.historico.map((x) => x.id)).toEqual(['2', '1']);
  });

  it('tocar um da fila: vira o próximo, sem cortar o atual', () => {
    const { result } = tocarTres();
    act(() => result.current.tocar('3'));
    expect(result.current.atual?.id).toBe('1');
    expect(result.current.fila.map((x) => x.id)).toEqual(['3', '2']);
    act(() => vi.advanceTimersByTime(PROXIMO_EM));
    expect(result.current.atual?.id).toBe('3');
  });

  it('tocar de novo um que já tocou, com a fila vazia: toca na hora e pausa o LivePix de novo', () => {
    const { result, aoComecar, aoTerminar } = tocarTres();
    act(() => vi.advanceTimersByTime(PROXIMO_EM * 3));
    expect(result.current.atual).toBeNull();
    expect(aoTerminar).toHaveBeenCalledTimes(1);
    act(() => result.current.tocar('1'));
    expect(result.current.atual?.id).toBe('1');
    expect(aoComecar).toHaveBeenCalledTimes(2);
    expect(result.current.historico[0].id).toBe('1');
    expect(result.current.historico.filter((x) => x.id === '1')).toHaveLength(1); // não duplica no histórico
  });

  it('repetir o mesmo seguido muda a "vez" (o cartão anima de novo)', () => {
    const { result } = renderHook(() => useFilaAlertas());
    act(() => result.current.adicionar(a('1')));
    const vez = result.current.atual?.vez;
    act(() => result.current.tocar('1'));
    act(() => vi.advanceTimersByTime(PROXIMO_EM));
    expect(result.current.atual?.id).toBe('1');
    expect(result.current.atual?.vez).not.toBe(vez);
  });

  it('remover tira da fila', () => {
    const { result } = tocarTres();
    act(() => result.current.remover('2'));
    expect(result.current.fila.map((x) => x.id)).toEqual(['3']);
  });

  it('pular: o atual sai agora (0,5 s de saída) e entra o próximo', () => {
    const { result } = tocarTres();
    act(() => vi.advanceTimersByTime(1000));
    act(() => result.current.pular());
    expect(result.current.saindo).toBe(true);
    act(() => vi.advanceTimersByTime(PROXIMO_EM - SAIR_EM));
    expect(result.current.atual?.id).toBe('2');
    expect(result.current.saindo).toBe(false);
  });

  it('pausar: termina o atual e espera (solta o LivePix); retomar continua; chegada nova também espera', () => {
    const { result, aoTerminar, aoComecar } = tocarTres();
    act(() => result.current.pausar());
    expect(result.current.pausado).toBe(true);
    act(() => vi.advanceTimersByTime(PROXIMO_EM));
    expect(result.current.atual).toBeNull();
    expect(result.current.fila.map((x) => x.id)).toEqual(['2', '3']);
    expect(aoTerminar).toHaveBeenCalledTimes(1);
    act(() => result.current.adicionar(a('4')));
    expect(result.current.atual).toBeNull();
    act(() => result.current.retomar());
    expect(result.current.atual?.id).toBe('2');
    expect(aoComecar).toHaveBeenCalledTimes(2);
  });

  it('pausado, tocar um escolhido toca só ele e continua pausado', () => {
    const { result } = tocarTres();
    act(() => result.current.pausar());
    act(() => vi.advanceTimersByTime(PROXIMO_EM));
    act(() => result.current.tocar('3'));
    expect(result.current.atual?.id).toBe('3');
    act(() => vi.advanceTimersByTime(PROXIMO_EM));
    expect(result.current.atual).toBeNull();
    expect(result.current.fila.map((x) => x.id)).toEqual(['2']);
  });

  it('id repetido (mesma mensagem chegando de novo) não entra duas vezes', () => {
    const { result } = tocarTres();
    act(() => result.current.adicionar(a('3')));
    act(() => result.current.adicionar(a('1')));
    expect(result.current.fila.map((x) => x.id)).toEqual(['2', '3']);
  });

  it('começa com o que estava salvo (fonte do OBS recarregada)', () => {
    const { result } = renderHook(() =>
      useFilaAlertas({ inicial: { fila: [a('9')], historico: [{ ...a('8'), tocadoEm: 1 }], pausado: true } }),
    );
    expect(result.current.atual).toBeNull(); // pausado: não sai tocando
    expect(result.current.fila.map((x) => x.id)).toEqual(['9']);
    expect(result.current.historico.map((x) => x.id)).toEqual(['8']);
  });
});
