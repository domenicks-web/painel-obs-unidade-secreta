import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('../lib/supabase', () => ({ supabase: { rpc: vi.fn(async () => ({ data: null, error: null })) } }));

import { supabase } from '../lib/supabase';
import { apoioDoYouTube, esquecerCotacoes, useGravarApoiosYouTube } from './youtube';
import type { MsgChat } from '../chat/tipos';

const msg = (extra: Partial<MsgChat>): MsgChat => ({
  id: 'x', idOriginal: '7', plataforma: 'yt', autor: 'Lipe', txt: 'salve', tipo: 'msg', mod: false, membro: false, ...extra,
});

describe('apoioDoYouTube', () => {
  it('superchat, sticker e membro novo do YouTube', () => {
    expect(apoioDoYouTube(msg({ tipo: 'super', valor: 'US$ 5.00' }))).toEqual({ tipo: 'superchat', externo: 'yt:7:Lipe:US$ 5.00' });
    expect(apoioDoYouTube(msg({ tipo: 'super', valor: 'R$ 5,00', sticker: true }))?.tipo).toBe('sticker');
    expect(apoioDoYouTube(msg({ tipo: 'membro', membroNovo: true }))?.tipo).toBe('membro');
  });
  it('mensagem comum, aniversário de membro, Twitch e TikTok não', () => {
    expect(apoioDoYouTube(msg({}))).toBeNull();
    expect(apoioDoYouTube(msg({ tipo: 'membro', membroNovo: false }))).toBeNull();
    expect(apoioDoYouTube(msg({ tipo: 'super', valor: '100 bits', plataforma: 'tw' }))).toBeNull();
    expect(apoioDoYouTube(msg({ tipo: 'super', valor: '3 roses', plataforma: 'tt' }))).toBeNull();
  });
});

describe('useGravarApoiosYouTube', () => {
  beforeEach(() => {
    vi.mocked(supabase.rpc).mockClear();
    esquecerCotacoes();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ taxas: { BRL: 1, USD: 0.2 } }))));
  });

  it('grava o superchat convertido em reais, uma vez só', async () => {
    const lista = [msg({ id: 'a', tipo: 'super', valor: 'US$ 10.00', txt: 'toma' }), msg({ id: 'b' })];
    const { rerender } = renderHook(({ m }) => useGravarApoiosYouTube(m, true), { initialProps: { m: lista } });
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalledTimes(1));
    expect(supabase.rpc).toHaveBeenCalledWith('registrar_apoio_youtube', {
      p_externo: 'yt:7:Lipe:US$ 10.00', p_tipo: 'superchat', p_nome: 'Lipe', p_msg: 'toma', p_valor: 50, p_valor_texto: 'US$ 10.00',
    });
    rerender({ m: [...lista, msg({ id: 'c' })] });
    await new Promise((r) => setTimeout(r, 20));
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
  });

  it('câmbio fora do ar: usa a tabela fixa', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: 500 })));
    renderHook(() => useGravarApoiosYouTube([msg({ id: 'a', tipo: 'super', valor: 'R$ 8,00' })], true));
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalled());
    expect(vi.mocked(supabase.rpc).mock.calls[0][1]).toMatchObject({ p_valor: 8 });
  });

  it('desligado (modo teste do chat): não grava nada', async () => {
    renderHook(() => useGravarApoiosYouTube([msg({ id: 'a', tipo: 'super', valor: 'R$ 8,00' })], false));
    await new Promise((r) => setTimeout(r, 20));
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});
