import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

type Handler = (p: { eventType: string; new: unknown; old: unknown }) => void;
let handler: Handler | null = null;
let statusCanal: ((s: string) => void) | null = null;

vi.mock('../lib/supabase', () => {
  const canal = {
    on: vi.fn((_t: string, _f: unknown, h: Handler) => {
      handler = h;
      return canal;
    }),
    subscribe: vi.fn((cb?: (s: string) => void) => {
      statusCanal = cb ?? null;
      return canal;
    }),
  };
  return { supabase: { from: vi.fn(), rpc: vi.fn(), channel: vi.fn(() => canal), removeChannel: vi.fn() } };
});

import { supabase } from '../lib/supabase';
import { useApoios } from './useApoios';

const pix = (id: string, extra = {}) => ({ id, nome: id, valor: '10.00', msg: '', origem: 'manual', externo_id: null, off: false, created_at: '2026-09-28T20:00:00Z', ...extra });

beforeEach(() => {
  vi.clearAllMocks();
  const limit = vi.fn().mockResolvedValue({ data: [pix('b'), pix('a')], error: null });
  vi.mocked(supabase.from).mockReturnValue({ select: () => ({ order: () => ({ limit }) }) } as never);
});

describe('useApoios', () => {
  it('carrega, normaliza valor e aplica INSERT/UPDATE do Realtime', async () => {
    const { result } = renderHook(() => useApoios());
    await waitFor(() => expect(result.current.lista).toHaveLength(2));
    expect(result.current.lista[0].valor).toBe(10);
    act(() => handler!({ eventType: 'INSERT', new: pix('c'), old: {} }));
    expect(result.current.lista[0].id).toBe('c');
    act(() => handler!({ eventType: 'UPDATE', new: pix('a', { off: true }), old: {} }));
    expect(result.current.lista.find((x) => x.id === 'a')!.off).toBe(true);
  });

  it('recarrega a lista quando o Realtime reconecta', async () => {
    const { result } = renderHook(() => useApoios());
    await waitFor(() => expect(result.current.lista).toHaveLength(2));
    const limit = vi.fn().mockResolvedValue({ data: [pix('c'), pix('b'), pix('a')], error: null });
    vi.mocked(supabase.from).mockReturnValue({ select: () => ({ order: () => ({ limit }) }) } as never);
    act(() => statusCanal!('SUBSCRIBED'));
    await waitFor(() => expect(result.current.lista.map((x) => x.id)).toEqual(['c', 'b', 'a']));
  });

  it('adicionarManual chama a RPC e devolve erro legível', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: { message: 'não autorizado' } } as never);
    const { result } = renderHook(() => useApoios());
    let erro: string | null = null;
    await act(async () => {
      erro = await result.current.adicionarManual('Ana', 5);
    });
    expect(supabase.rpc).toHaveBeenCalledWith('adicionar_pix_manual', { p_nome: 'Ana', p_valor: 5, p_msg: '' });
    expect(erro).toBe('não autorizado');
  });
});
