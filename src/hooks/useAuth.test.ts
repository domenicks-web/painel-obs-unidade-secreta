import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuth } from './useAuth';

vi.mock('../lib/supabase', () => {
  const onAuthStateChange = vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }));
  const getSession = vi.fn();
  const single = vi.fn();
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { supabase: { auth: { getSession, onAuthStateChange }, from } };
});

import { supabase } from '../lib/supabase';

describe('useAuth', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolve papel a partir de membros_equipe quando há sessão', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'a@a.com' } } },
    } as never);
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { papel: 'admin' }, error: null }) })) })),
    } as never);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.papel).toBe('admin');
  });

  it('retorna papel nulo quando não há sessão', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } } as never);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.papel).toBeNull();
    expect(result.current.sessao).toBeNull();
  });
});
