import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

// Supabase falso: leitura da linha livepix_controle + canal do Realtime
const sb = vi.hoisted(() => {
  const estado = {
    linha: { pausado: false, ultimo_comando: null, por_nome: null, em: null } as Record<string, unknown> | null,
    erro: null as unknown,
    aoMudar: null as ((p: { new: unknown }) => void) | null,
  };
  const canal = {
    on: (_t: string, _f: unknown, cb: (p: { new: unknown }) => void) => {
      estado.aoMudar = cb;
      return canal;
    },
    subscribe: () => canal,
  };
  const supabase = {
    auth: { getSession: async () => ({ data: { session: { access_token: 'jwt-ana' } } }) },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: estado.linha, error: estado.erro }) }) }),
    }),
    channel: () => canal,
    removeChannel: () => {},
  };
  return { estado, supabase };
});
vi.mock('../lib/supabase', () => ({ supabase: sb.supabase }));

import { useControlesLivePix } from './useControlesLivePix';

const resp = (status: number, corpo?: unknown) => new Response(corpo === undefined ? null : JSON.stringify(corpo), { status });
const linha = (comando: string, pausado: boolean, em: string) => ({ pausado, ultimo_comando: comando, por_nome: 'Ana', em });
let fetchMock: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  sb.estado.linha = { pausado: false, ultimo_comando: null, por_nome: null, em: null };
  sb.estado.erro = null;
  fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(resp(200, { estado: null }));
});
afterEach(() => vi.restoreAllMocks());

describe('useControlesLivePix', () => {
  it('lê o estado do banco, sem chamar o LivePix', async () => {
    sb.estado.linha = linha('pausar', true, '2026-09-29T15:00:00Z');
    const { result } = renderHook(() => useControlesLivePix());
    await waitFor(() => expect(result.current.status).toBe('pausado'));
    expect(result.current.ultimo).toEqual({ comando: 'pausar', por: 'Ana', em: '2026-09-29T15:00:00Z' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('pausar/retomar alterna pelo estado e usa a linha devolvida', async () => {
    const { result } = renderHook(() => useControlesLivePix());
    await waitFor(() => expect(result.current.status).toBe('ativo'));
    fetchMock.mockResolvedValue(resp(200, { estado: linha('pausar', true, '2026-09-29T15:00:01Z') }));
    let ok = false;
    await act(async () => {
      ok = await result.current.alternarPausa();
    });
    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenLastCalledWith('/api/livepix/pausar', expect.objectContaining({ method: 'POST' }));
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer jwt-ana');
    expect(result.current.status).toBe('pausado');

    fetchMock.mockResolvedValue(resp(200, { estado: linha('retomar', false, '2026-09-29T15:00:02Z') }));
    await act(async () => {
      await result.current.alternarPausa();
    });
    expect(fetchMock).toHaveBeenLastCalledWith('/api/livepix/retomar', expect.anything());
    expect(result.current.status).toBe('ativo');
  });

  it('pular, repetir e limpar chamam as rotas certas; falha devolve false', async () => {
    const { result } = renderHook(() => useControlesLivePix());
    await waitFor(() => expect(result.current.status).toBe('ativo'));
    await act(async () => {
      await result.current.pular();
      await result.current.repetir();
      await result.current.limpar();
    });
    const urls = fetchMock.mock.calls.map((c: unknown[]) => c[0]);
    expect(urls).toEqual(['/api/livepix/pular', '/api/livepix/repetir', '/api/livepix/limpar']);

    fetchMock.mockResolvedValue(resp(502, { erro: 'x' }));
    let ok = true;
    await act(async () => {
      ok = await result.current.alternarPausa();
    });
    expect(ok).toBe(false);
    expect(result.current.status).toBe('ativo');
    fetchMock.mockRejectedValue(new TypeError('rede caiu'));
    await act(async () => {
      ok = await result.current.limpar();
    });
    expect(ok).toBe(false);
  });

  it('o que outra pessoa fez chega pelo Realtime', async () => {
    const { result } = renderHook(() => useControlesLivePix());
    await waitFor(() => expect(result.current.status).toBe('ativo'));
    act(() => sb.estado.aoMudar!({ new: linha('pausar', true, '2026-09-29T15:00:05Z') }));
    expect(result.current.status).toBe('pausado');
  });

  it('eco atrasado de um comando mais velho não desfaz o mais novo', async () => {
    const { result } = renderHook(() => useControlesLivePix());
    await waitFor(() => expect(result.current.status).toBe('ativo'));
    fetchMock.mockResolvedValue(resp(200, { estado: linha('retomar', false, '2026-09-29T15:00:10Z') }));
    await act(async () => {
      await result.current.alternarPausa();
    });
    act(() => sb.estado.aoMudar!({ new: linha('pausar', true, '2026-09-29T15:00:09Z') }));
    expect(result.current.status).toBe('ativo');
    expect(result.current.ultimo?.comando).toBe('retomar');
  });

  it('se não conseguir ler o estado (ex.: 0006 não rodada), fica em erro', async () => {
    sb.estado.linha = null;
    sb.estado.erro = { message: 'relation does not exist' };
    const { result } = renderHook(() => useControlesLivePix());
    await waitFor(() => expect(result.current.status).toBe('erro'));
  });
});
