import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSala } from './useSala';
import { ESTADO_PADRAO } from '../types/estado';

function criarCanalFalso() {
  return {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn((cb: (status: string) => void) => {
      cb('SUBSCRIBED');
      return criarCanalFalso();
    }),
  };
}

vi.mock('../lib/supabase', () => {
  const single = vi.fn();
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  const rpc = vi.fn();
  const channel = vi.fn(() => criarCanalFalso());
  const removeChannel = vi.fn();
  return { supabase: { from, select, eq, single, rpc, channel, removeChannel } };
});

import { supabase } from '../lib/supabase';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('useSala', () => {
  it('carrega o estado inicial da sala e marca status ao_vivo', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: 'sala-1', estado: { ...ESTADO_PADRAO, titulo: 'DO BANCO' }, updated_at: '2026-01-01T00:00:00Z', updated_by_nome: 'FULANO' },
      error: null,
    });
    vi.mocked(supabase.from).mockReturnValue({ select: vi.fn(() => ({ eq: vi.fn(() => ({ single })) })) } as never);

    const { result } = renderHook(() => useSala('principal'));

    await waitFor(() => expect(result.current.status).toBe('ao_vivo'));
    expect(result.current.estado.titulo).toBe('DO BANCO');
    expect(result.current.updatedByNome).toBe('FULANO');
  });

  it('aplica patch de forma otimista antes da resposta do RPC', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: 'sala-1', estado: ESTADO_PADRAO, updated_at: '2026-01-01T00:00:00Z', updated_by_nome: null },
      error: null,
    });
    vi.mocked(supabase.from).mockReturnValue({ select: vi.fn(() => ({ eq: vi.fn(() => ({ single })) })) } as never);
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never);

    const { result } = renderHook(() => useSala('principal'));
    await waitFor(() => expect(result.current.status).toBe('ao_vivo'));

    await act(async () => {
      await result.current.atualizar({ titulo: 'NOVO TÍTULO' });
    });

    expect(result.current.estado.titulo).toBe('NOVO TÍTULO');
    expect(supabase.rpc).toHaveBeenCalledWith('atualizar_estado', { p_slug: 'principal', p_patch: { titulo: 'NOVO TÍTULO' } });
  });

  it('usa o cache local como estado inicial antes da resposta de rede', async () => {
    localStorage.setItem(
      'us-obs-cache-principal',
      JSON.stringify({ id: 'sala-1', estado: { ...ESTADO_PADRAO, titulo: 'DO CACHE' }, updatedAt: '2026-01-01T00:00:00Z', updatedByNome: null }),
    );
    const single = vi.fn(() => new Promise(() => {})); // nunca resolve
    vi.mocked(supabase.from).mockReturnValue({ select: vi.fn(() => ({ eq: vi.fn(() => ({ single })) })) } as never);

    const { result } = renderHook(() => useSala('principal'));

    expect(result.current.estado.titulo).toBe('DO CACHE');
  });
});
