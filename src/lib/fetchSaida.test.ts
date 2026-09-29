import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchComSaida } from './fetchSaida';

afterEach(() => vi.restoreAllMocks());

describe('fetchComSaida', () => {
  it('com a aba escondida/fechando, pede keepalive pra requisição não ser cortada', async () => {
    const fetchReal = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    await fetchComSaida('https://x/rpc', { method: 'POST', body: '{}' });
    expect(fetchReal).toHaveBeenCalledWith('https://x/rpc', { method: 'POST', body: '{}', keepalive: true });
  });

  it('com a aba visível, não mexe na requisição', async () => {
    const fetchReal = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    await fetchComSaida('https://x/rest', { method: 'GET' });
    expect(fetchReal).toHaveBeenCalledWith('https://x/rest', { method: 'GET' });
  });
});
