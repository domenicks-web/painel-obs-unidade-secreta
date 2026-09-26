import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEventos } from './useEventos';

function criarCanalFalso() {
  const canal = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(() => canal),
  };
  return canal;
}

vi.mock('../lib/supabase', () => ({
  supabase: { channel: vi.fn(() => criarCanalFalso()), removeChannel: vi.fn(), rpc: vi.fn() },
}));

import { supabase } from '../lib/supabase';

beforeEach(() => vi.clearAllMocks());

describe('useEventos', () => {
  it('atualiza ultimoEvento quando chega um INSERT de tipo doacao', () => {
    let handler: (payload: unknown) => void = () => {};
    vi.mocked(supabase.channel).mockReturnValue({
      on: vi.fn((_evento, _filtro, cb) => {
        handler = cb;
        return { subscribe: vi.fn().mockReturnThis() };
      }),
      subscribe: vi.fn().mockReturnThis(),
    } as never);

    const { result } = renderHook(() => useEventos('principal'));

    act(() => {
      handler({ new: { tipo: 'doacao', payload: { nome: 'FULANO', mensagem: 'Valeu, galera!' }, created_at: new Date().toISOString() } });
    });

    expect(result.current.ultimoEvento).toEqual({ nome: 'FULANO', mensagem: 'Valeu, galera!' });
  });

  it('dispara um evento via RPC', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never);
    const { result } = renderHook(() => useEventos('principal'));

    await act(async () => {
      await result.current.disparar({ nome: 'CICLANO', mensagem: 'Teste' });
    });

    expect(supabase.rpc).toHaveBeenCalledWith('disparar_evento', {
      p_slug: 'principal',
      p_tipo: 'doacao',
      p_payload: { nome: 'CICLANO', mensagem: 'Teste' },
    });
  });
});
