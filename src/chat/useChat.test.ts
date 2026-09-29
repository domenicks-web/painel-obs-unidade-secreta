import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useChat } from './useChat';

class WsFalso {
  static todos: WsFalso[] = [];
  onopen?: () => void;
  onmessage?: (e: { data: string }) => void;
  onclose?: () => void;
  fechado = false;
  constructor(public url: string) {
    WsFalso.todos.push(this);
  }
  close() {
    this.fechado = true;
  }
}

const ultimo = () => WsFalso.todos[WsFalso.todos.length - 1];
const chega = (dado: unknown) => act(() => ultimo().onmessage?.({ data: JSON.stringify(dado) }));

beforeEach(() => {
  WsFalso.todos = [];
  vi.stubGlobal('WebSocket', WsFalso);
  vi.useFakeTimers();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('useChat', () => {
  it('sem sessão não conecta', () => {
    const { result } = renderHook(() => useChat({ sessao: '', max: 5 }));
    expect(result.current.status).toBe('sem_sessao');
    expect(WsFalso.todos).toHaveLength(0);
  });

  it('conecta no canal 4 da sessão, recebe, ignora repetida e guarda só as últimas', () => {
    const { result } = renderHook(() => useChat({ sessao: 'abc', max: 2 }));
    expect(ultimo().url).toBe('wss://io.socialstream.ninja/join/abc/4');
    expect(result.current.status).toBe('conectando');
    act(() => ultimo().onopen?.());
    expect(result.current.status).toBe('ao_vivo');
    chega({ id: 1, type: 'youtube', chatname: 'a', chatmessage: 'um' });
    chega({ id: 1, type: 'youtube', chatname: 'a', chatmessage: 'um' });
    chega({ id: 2, type: 'twitch', chatname: 'b', chatmessage: 'dois' });
    chega({ id: 3, type: 'tiktok', chatname: 'c', chatmessage: 'três' });
    act(() => ultimo().onmessage?.({ data: 'não é json' }));
    expect(result.current.msgs.map((m) => m.txt)).toEqual(['dois', 'três']);
  });

  it('caiu: reconecta com espera crescente; desmontar fecha e para de tentar', () => {
    const { result, unmount } = renderHook(() => useChat({ sessao: 'abc', max: 5 }));
    act(() => ultimo().onclose?.());
    expect(result.current.status).toBe('reconectando');
    act(() => vi.advanceTimersByTime(1000));
    expect(WsFalso.todos).toHaveLength(2);
    act(() => ultimo().onclose?.());
    act(() => vi.advanceTimersByTime(1999));
    expect(WsFalso.todos).toHaveLength(2);
    act(() => vi.advanceTimersByTime(1));
    expect(WsFalso.todos).toHaveLength(3);
    unmount();
    expect(ultimo().fechado).toBe(true);
    act(() => vi.advanceTimersByTime(60000));
    expect(WsFalso.todos).toHaveLength(3);
  });

  it('modo teste: não conecta, aceita adicionar e limpar', () => {
    const { result } = renderHook(() => useChat({ sessao: 'abc', max: 5, teste: true }));
    expect(WsFalso.todos).toHaveLength(0);
    expect(result.current.status).toBe('teste');
    act(() => result.current.adicionar({ id: 'x', plataforma: 'yt', autor: 'a', txt: 'oi', tipo: 'msg', mod: false, membro: false }));
    expect(result.current.msgs).toHaveLength(1);
    act(() => result.current.limpar());
    expect(result.current.msgs).toHaveLength(0);
  });
});
