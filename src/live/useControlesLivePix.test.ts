import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

vi.mock('../lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'jwt-ana' } } }) } },
}));

import { useControlesLivePix } from './useControlesLivePix';

const resp = (status: number, corpo?: unknown) => new Response(corpo === undefined ? null : JSON.stringify(corpo), { status });
let fetchMock: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(resp(200, { autoPlay: true }));
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('useControlesLivePix', () => {
  it('lê o estado inicial com o token de quem está logado', async () => {
    const { result } = renderHook(() => useControlesLivePix());
    await waitFor(() => expect(result.current.status).toBe('ativo'));
    expect(fetchMock).toHaveBeenCalledWith('/api/livepix/controls', expect.objectContaining({ method: 'GET' }));
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer jwt-ana');
  });

  it('pausar manda autoPlay false e marca pausado; retomar manda true', async () => {
    const { result } = renderHook(() => useControlesLivePix());
    await waitFor(() => expect(result.current.status).toBe('ativo'));
    fetchMock.mockResolvedValue(resp(204));
    let ok = false;
    await act(async () => {
      ok = await result.current.alternarPausa();
    });
    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenLastCalledWith('/api/livepix/controls', expect.objectContaining({ method: 'PATCH', body: '{"autoPlay":false}' }));
    expect(result.current.status).toBe('pausado');
    await act(async () => {
      await result.current.alternarPausa();
    });
    expect(fetchMock).toHaveBeenLastCalledWith('/api/livepix/controls', expect.objectContaining({ body: '{"autoPlay":true}' }));
    expect(result.current.status).toBe('ativo');
  });

  it('pular e repetir chamam as rotas certas; falha devolve false e não muda o estado', async () => {
    const { result } = renderHook(() => useControlesLivePix());
    await waitFor(() => expect(result.current.status).toBe('ativo'));
    fetchMock.mockResolvedValue(resp(204));
    await act(async () => {
      await result.current.pular();
      await result.current.repetir();
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/livepix/skip', expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenCalledWith('/api/livepix/replay', expect.objectContaining({ method: 'POST' }));
    fetchMock.mockResolvedValue(resp(502, { erro: 'x' }));
    let ok = true;
    await act(async () => {
      ok = await result.current.alternarPausa();
    });
    expect(ok).toBe(false);
    expect(result.current.status).toBe('ativo');
    fetchMock.mockRejectedValue(new TypeError('rede caiu'));
    await act(async () => {
      ok = await result.current.pular();
    });
    expect(ok).toBe(false);
  });

  it('se não conseguir ler o estado, fica em erro', async () => {
    fetchMock.mockResolvedValue(resp(500, { erro: 'não configurado' }));
    const { result } = renderHook(() => useControlesLivePix());
    await waitFor(() => expect(result.current.status).toBe('erro'));
  });

  it('confere de novo a cada 20 s (alguém pode ter pausado em outro painel ou no LivePix)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { result } = renderHook(() => useControlesLivePix());
    await waitFor(() => expect(result.current.status).toBe('ativo'));
    fetchMock.mockResolvedValue(resp(200, { autoPlay: false }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    await waitFor(() => expect(result.current.status).toBe('pausado'));
  });
});
