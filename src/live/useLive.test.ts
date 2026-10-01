import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ESTADO_PADRAO } from './tipos';

type Handler = (payload: { new: unknown }) => void;
let handlerUpdate: Handler | null = null;
let statusCanal: ((s: string) => void) | null = null;

vi.mock('../lib/supabase', () => {
  const canal = {
    on: vi.fn((_t: string, _f: unknown, h: Handler) => {
      handlerUpdate = h;
      return canal;
    }),
    subscribe: vi.fn((cb: (s: string) => void) => {
      statusCanal = cb;
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

function linha(estado: object, nome: string | null = null, versao?: number) {
  return { estado: { ...ESTADO_PADRAO, ...estado }, updated_at: '2026-09-28T20:00:00Z', updated_by_nome: nome, versao };
}

beforeEach(() => {
  vi.clearAllMocks();
  const single = vi.fn().mockResolvedValue({ data: linha({ titulo: 'DO BANCO' }, 'Ana'), error: null });
  vi.mocked(supabase.from).mockReturnValue({ select: () => ({ eq: () => ({ single }) }) } as never);
  vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never);
});
afterEach(() => vi.useRealTimers());

describe('useLive · estado guardado no navegador (telas do OBS)', () => {
  beforeEach(() => localStorage.clear());

  it('desenha na hora com o último estado salvo e troca quando o banco responde', async () => {
    localStorage.setItem('us-live:principal', JSON.stringify({ titulo: 'SALVO', golsA: 3 }));
    let responder!: (v: unknown) => void;
    const single = vi.fn(() => new Promise((r) => (responder = r)));
    vi.mocked(supabase.from).mockReturnValue({ select: () => ({ eq: () => ({ single }) }) } as never);

    const { result } = renderHook(() => useLive({ guardarLocal: true }));
    // antes de qualquer resposta: já é o salvo (e o que faltar vem do padrão)
    expect(result.current.estado.titulo).toBe('SALVO');
    expect(result.current.estado.golsA).toBe(3);
    expect(result.current.estado.timeA).toBe(ESTADO_PADRAO.timeA);

    await act(async () => responder({ data: linha({ titulo: 'DO BANCO' }), error: null }));
    expect(result.current.estado.titulo).toBe('DO BANCO');
    expect(JSON.parse(localStorage.getItem('us-live:principal')!).titulo).toBe('DO BANCO');
  });

  it('o Realtime também atualiza o salvo', async () => {
    const { result } = renderHook(() => useLive({ guardarLocal: true }));
    await waitFor(() => expect(result.current.status).toBe('ao_vivo'));
    act(() => handlerUpdate!({ new: linha({ titulo: 'AO VIVO' }) }));
    expect(JSON.parse(localStorage.getItem('us-live:principal')!).titulo).toBe('AO VIVO');
  });

  it('salvo corrompido ou ausente: abre com o padrão', () => {
    localStorage.setItem('us-live:principal', '{quebrado');
    vi.mocked(supabase.from).mockReturnValue({ select: () => ({ eq: () => ({ single: () => new Promise(() => {}) }) }) } as never);
    const { result } = renderHook(() => useLive({ guardarLocal: true }));
    expect(result.current.estado.titulo).toBe(ESTADO_PADRAO.titulo);
  });

  it('sem guardarLocal (painel) não lê nem grava', async () => {
    localStorage.setItem('us-live:principal', JSON.stringify({ titulo: 'SALVO' }));
    vi.mocked(supabase.from).mockReturnValue({ select: () => ({ eq: () => ({ single: () => new Promise(() => {}) }) }) } as never);
    const { result } = renderHook(() => useLive());
    expect(result.current.estado.titulo).toBe(ESTADO_PADRAO.titulo);
    expect(JSON.parse(localStorage.getItem('us-live:principal')!).titulo).toBe('SALVO');
  });
});

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

  it('botão logo depois de digitar no mesmo campo cancela a gravação atrasada', async () => {
    const { result } = renderHook(() => useLive());
    await waitFor(() => expect(result.current.status).toBe('ao_vivo'));
    vi.useFakeTimers();
    act(() => result.current.salvarDepois({ 'enquete.casa': 40 }));
    await act(async () => {
      await result.current.salvar({ 'enquete.casa': 55 });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenCalledWith('atualizar_estado', { p_slug: 'principal', p_patch: { 'enquete.casa': 55 } });
  });

  it('patch por caminho mexe só no pedaço e não esconde a mudança do outro editor', async () => {
    const { result } = renderHook(() => useLive());
    await waitFor(() => expect(result.current.status).toBe('ao_vivo'));
    vi.useFakeTimers();
    act(() => result.current.salvarDepois({ 'nomes.1': 'ZÉ', 'enquete.mostrar': true }));
    const outro = [...ESTADO_PADRAO.nomes];
    outro[3] = 'BIA';
    act(() => handlerUpdate!({ new: linha({ nomes: outro, enquete: { casa: 30, empate: 0, fora: 0, mostrar: false } }) }));
    expect(result.current.estado.nomes).toEqual(['NOME 01', 'ZÉ', 'NOME 03', 'BIA', 'NOME 05', 'NOME 06']);
    expect(result.current.estado.enquete).toEqual({ casa: 30, empate: 0, fora: 0, mostrar: true });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(supabase.rpc).toHaveBeenCalledWith('atualizar_estado', { p_slug: 'principal', p_patch: { 'nomes.1': 'ZÉ' } });
    expect(supabase.rpc).toHaveBeenCalledWith('atualizar_estado', { p_slug: 'principal', p_patch: { 'enquete.mostrar': true } });
  });

  it('quando o Realtime cai e volta, recarrega o estado do banco', async () => {
    const { result } = renderHook(() => useLive());
    await waitFor(() => expect(result.current.estado.titulo).toBe('DO BANCO'));
    act(() => statusCanal!('CHANNEL_ERROR'));
    expect(result.current.status).toBe('reconectando');
    // enquanto estava fora, alguém mudou o título
    const single = vi.fn().mockResolvedValue({ data: linha({ titulo: 'MUDOU LÁ FORA' }, 'Bia'), error: null });
    vi.mocked(supabase.from).mockReturnValue({ select: () => ({ eq: () => ({ single }) }) } as never);
    act(() => statusCanal!('SUBSCRIBED'));
    await waitFor(() => expect(result.current.estado.titulo).toBe('MUDOU LÁ FORA'));
    expect(result.current.status).toBe('ao_vivo');
    expect(result.current.editadoPor).toBe('Bia');
  });

  it('volta a buscar o estado quando a internet volta', async () => {
    const { result } = renderHook(() => useLive());
    await waitFor(() => expect(result.current.estado.titulo).toBe('DO BANCO'));
    const single = vi.fn().mockResolvedValue({ data: linha({ titulo: 'DEPOIS DO WIFI' }), error: null });
    vi.mocked(supabase.from).mockReturnValue({ select: () => ({ eq: () => ({ single }) }) } as never);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() => expect(result.current.estado.titulo).toBe('DEPOIS DO WIFI'));
  });

  it('ao esconder/fechar a página grava na hora o que estava esperando os 400 ms', async () => {
    const { result } = renderHook(() => useLive());
    await waitFor(() => expect(result.current.status).toBe('ao_vivo'));
    vi.useFakeTimers();
    act(() => result.current.salvarDepois({ titulo: 'QUASE', 'nomes.2': 'CAIO' }));
    expect(supabase.rpc).not.toHaveBeenCalled();
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenCalledWith('atualizar_estado', { p_slug: 'principal', p_patch: { titulo: 'QUASE', 'nomes.2': 'CAIO' } });
    // o timer original não manda de novo
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
  });

  it('sair do painel (desmontar) também grava o pendente em vez de jogar fora', async () => {
    const { result, unmount } = renderHook(() => useLive());
    await waitFor(() => expect(result.current.status).toBe('ao_vivo'));
    vi.useFakeTimers();
    act(() => result.current.salvarDepois({ proximo: 'SÁBADO' }));
    unmount();
    expect(supabase.rpc).toHaveBeenCalledWith('atualizar_estado', { p_slug: 'principal', p_patch: { proximo: 'SÁBADO' } });
  });

  it('relógio e reiniciar usam as RPCs dedicadas', async () => {
    const { result } = renderHook(() => useLive());
    await waitFor(() => expect(result.current.status).toBe('ao_vivo'));
    await act(() => result.current.relogio('iniciar'));
    await act(() => result.current.reiniciarContagem());
    expect(supabase.rpc).toHaveBeenCalledWith('controlar_relogio', { p_slug: 'principal', p_acao: 'iniciar' });
    expect(supabase.rpc).toHaveBeenCalledWith('reiniciar_contagem', { p_slug: 'principal' });
  });

  it('resposta atrasada da RPC (versão menor) não traz de volta o estado velho', async () => {
    let responder!: (v: unknown) => void;
    vi.mocked(supabase.rpc).mockReturnValue(new Promise((r) => (responder = r)) as never);
    const { result } = renderHook(() => useLive());
    await waitFor(() => expect(result.current.status).toBe('ao_vivo'));
    let envio!: Promise<void>;
    act(() => void (envio = result.current.salvar({ titulo: 'MEU' })));
    // o eco da minha gravação e depois a de outra pessoa chegam antes da resposta
    act(() => handlerUpdate!({ new: linha({ titulo: 'MEU' }, 'Eu', 7) }));
    act(() => handlerUpdate!({ new: linha({ titulo: 'DO OUTRO' }, 'Bia', 8) }));
    await act(async () => {
      responder({ data: linha({ titulo: 'MEU' }, 'Eu', 7), error: null });
      await envio;
    });
    expect(result.current.estado.titulo).toBe('DO OUTRO');
    expect(result.current.editadoPor).toBe('Bia');
  });

  it('versão igual ou maior entra; linha sem versão (antes da 0008) também', async () => {
    const { result } = renderHook(() => useLive());
    await waitFor(() => expect(result.current.status).toBe('ao_vivo'));
    act(() => handlerUpdate!({ new: linha({ titulo: 'V5' }, null, 5) }));
    act(() => handlerUpdate!({ new: linha({ titulo: 'V5 DE NOVO' }, null, 5) }));
    expect(result.current.estado.titulo).toBe('V5 DE NOVO');
    act(() => handlerUpdate!({ new: linha({ titulo: 'V4' }, null, 4) }));
    expect(result.current.estado.titulo).toBe('V5 DE NOVO');
    act(() => handlerUpdate!({ new: linha({ titulo: 'SEM VERSÃO' }) }));
    expect(result.current.estado.titulo).toBe('SEM VERSÃO');
  });

  it('gol vai pela RPC que soma no banco e aplica a resposta', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: linha({ golsA: 3 }, 'Eu', 9), error: null } as never);
    const { result } = renderHook(() => useLive());
    await waitFor(() => expect(result.current.status).toBe('ao_vivo'));
    await act(() => result.current.gol('A', 1));
    expect(supabase.rpc).toHaveBeenCalledWith('somar_gol', { p_slug: 'principal', p_lado: 'A', p_delta: 1 });
    expect(result.current.estado.golsA).toBe(3);
  });

  it('ajustar e definir o relógio mandam os segundos e aplicam a resposta', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: linha({ clockAcumulado: 70 }, 'Eu', 3), error: null } as never);
    const { result } = renderHook(() => useLive());
    await waitFor(() => expect(result.current.status).toBe('ao_vivo'));
    await act(() => result.current.relogio('ajustar', 10));
    await act(() => result.current.relogio('definir', 2232));
    expect(supabase.rpc).toHaveBeenCalledWith('controlar_relogio', { p_slug: 'principal', p_acao: 'ajustar', p_segundos: 10 });
    expect(supabase.rpc).toHaveBeenCalledWith('controlar_relogio', { p_slug: 'principal', p_acao: 'definir', p_segundos: 2232 });
    expect(result.current.estado.clockAcumulado).toBe(70);
  });

  it('fixture não toca no Supabase', () => {
    const { result } = renderHook(() => useLive({ fixture: { ...ESTADO_PADRAO, titulo: 'FIX' } }));
    expect(result.current.estado.titulo).toBe('FIX');
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
