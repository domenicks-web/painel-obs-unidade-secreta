import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ESTADO_PADRAO } from './tipos';

type Handler = (payload: { new: unknown }) => void;
let handlerUpdate: Handler | null = null;

vi.mock('../lib/supabase', () => {
  const canal = {
    on: vi.fn((_t: string, _f: unknown, h: Handler) => {
      handlerUpdate = h;
      return canal;
    }),
    subscribe: vi.fn((cb: (s: string) => void) => {
      cb('SUBSCRIBED');
      return canal;
    }),
  };
  return {
    supabase: {
      from: vi.fn(),
      rpc: vi.fn(),
      channel: vi.fn(() => canal),
      removeChannel: vi.fn(),
    },
  };
});

import { supabase } from '../lib/supabase';
import { useLive } from './useLive';

function linha(estado: object, nome: string | null = null) {
  return { estado: { ...ESTADO_PADRAO, ...estado }, updated_at: '2026-09-28T20:00:00Z', updated_by_nome: nome };
}

beforeEach(() => {
  vi.clearAllMocks();
  const single = vi.fn().mockResolvedValue({ data: linha({ titulo: 'DO BANCO' }, 'Ana'), error: null });
  vi.mocked(supabase.from).mockReturnValue({ select: () => ({ eq: () => ({ single }) }) } as never);
  vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never);
});
afterEach(() => vi.useRealTimers());

describe('useLive', () => {
  it('carrega o estado e quem editou', async () => {
    const { result } = renderHook(() => useLive());
    await waitFor(() => expect(result.current.status).toBe('ao_vivo'));
    expect(result.current.estado.titulo).toBe('DO BANCO');
    expect(result.current.editadoPor).toBe('Ana');
  });

  it('salvarDepois espera 400 ms e manda só o último valor', async () => {
    const { result } = renderHook(() => useLive());
    await waitFor(() => expect(result.current.status).toBe('ao_vivo'));
    vi.useFakeTimers();
    act(() => {
      result.current.salvarDepois({ titulo: 'A' });
      result.current.salvarDepois({ titulo: 'AB' });
    });
    expect(result.current.estado.titulo).toBe('AB');
    expect(supabase.rpc).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenCalledWith('atualizar_estado', { p_slug: 'principal', p_patch: { titulo: 'AB' } });
  });

  it('eco do Realtime não desfaz campo com gravação pendente', async () => {
    const { result } = renderHook(() => useLive());
    await waitFor(() => expect(result.current.status).toBe('ao_vivo'));
    vi.useFakeTimers();
    act(() => result.current.salvarDepois({ titulo: 'DIGITANDO' }));
    act(() => handlerUpdate!({ new: linha({ titulo: 'VELHO', timeA: 'OUTRO TIME' }) }));
    expect(result.current.estado.titulo).toBe('DIGITANDO');
    expect(result.current.estado.timeA).toBe('OUTRO TIME');
  });

  it('relógio e reiniciar usam as RPCs dedicadas', async () => {
    const { result } = renderHook(() => useLive());
    await waitFor(() => expect(result.current.status).toBe('ao_vivo'));
    await act(() => result.current.relogio('iniciar'));
    await act(() => result.current.reiniciarContagem());
    expect(supabase.rpc).toHaveBeenCalledWith('controlar_relogio', { p_slug: 'principal', p_acao: 'iniciar' });
    expect(supabase.rpc).toHaveBeenCalledWith('reiniciar_contagem', { p_slug: 'principal' });
  });

  it('fixture não toca no Supabase', () => {
    const { result } = renderHook(() => useLive({ fixture: { ...ESTADO_PADRAO, titulo: 'FIX' } }));
    expect(result.current.estado.titulo).toBe('FIX');
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
