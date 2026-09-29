import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useAuth } from './useAuth';

vi.mock('../lib/supabase', () => {
  const onAuthStateChange = vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }));
  const getSession = vi.fn();
  const maybeSingle = vi.fn();
  const eq = vi.fn(() => ({ maybeSingle }));
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
      select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { papel: 'admin' }, error: null }) })) })),
    } as never);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.papel).toBe('admin');
  });

  it('expõe o erro da consulta em vez de tratar como conta não liberada', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'a@a.com' } } },
    } as never);
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'infinite recursion' } }) })),
      })),
    } as never);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.papel).toBeNull();
    expect(result.current.erro).toBe('infinite recursion');
  });

  it('retorna papel nulo quando não há sessão', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } } as never);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.papel).toBeNull();
    expect(result.current.sessao).toBeNull();
  });
  it('renovar o token ou trocar de aba (mesmo usuário) não volta pra "carregando" nem consulta de novo', async () => {
    const sessao = { user: { id: 'u1', email: 'a@a.com' } };
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: sessao } } as never);
    const maybeSingle = vi.fn().mockResolvedValue({ data: { papel: 'admin' }, error: null });
    vi.mocked(supabase.from).mockReturnValue({ select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })) } as never);
    let avisar: (evento: string, s: unknown) => void = () => {};
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation(((cb: typeof avisar) => {
      avisar = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }) as never);

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.papel).toBe('admin'));
    const estados: boolean[] = [];
    act(() => {
      avisar('SIGNED_IN', { user: { id: 'u1', email: 'a@a.com' } });
      estados.push(result.current.carregando);
      avisar('TOKEN_REFRESHED', { user: { id: 'u1', email: 'a@a.com' } });
      estados.push(result.current.carregando);
    });
    expect(estados).toEqual([false, false]);
    expect(result.current.carregando).toBe(false);
    expect(result.current.papel).toBe('admin');
    expect(maybeSingle).toHaveBeenCalledTimes(1);
  });

  it('trocar de usuário ou sair resolve o papel de novo', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: { user: { id: 'u1', email: 'a@a.com' } } } } as never);
    const maybeSingle = vi.fn().mockResolvedValue({ data: { papel: 'admin' }, error: null });
    vi.mocked(supabase.from).mockReturnValue({ select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })) } as never);
    let avisar: (evento: string, s: unknown) => void = () => {};
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation(((cb: typeof avisar) => {
      avisar = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }) as never);

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.papel).toBe('admin'));
    act(() => avisar('SIGNED_OUT', null));
    await waitFor(() => expect(result.current.sessao).toBeNull());
    expect(result.current.papel).toBeNull();
  });
});
