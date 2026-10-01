import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

// Supabase falso: um "servidor" de Realtime em memória, onde os canais de nomes iguais se falam
const sb = vi.hoisted(() => {
  type Ouvinte = { tipo: string; filtro: Record<string, string>; cb: (p: unknown) => void };
  const canais: { nome: string; ouvintes: Ouvinte[] }[] = [];
  const rpc = vi.fn(async () => ({ data: null, error: null as { message: string } | null }));
  const supabase = {
    channel(nome: string) {
      const c = {
        nome,
        ouvintes: [] as Ouvinte[],
        on(tipo: string, filtro: Record<string, string>, cb: (p: unknown) => void) {
          c.ouvintes.push({ tipo, filtro, cb });
          return c;
        },
        subscribe(cb?: (s: string) => void) {
          canais.push(c);
          cb?.('SUBSCRIBED');
          return c;
        },
        send(msg: { event: string; payload: unknown }) {
          for (const o of canais)
            if (o !== c && o.nome === nome)
              for (const x of o.ouvintes) if (x.tipo === 'broadcast' && x.filtro.event === msg.event) x.cb({ payload: msg.payload });
          return Promise.resolve('ok');
        },
      };
      return c;
    },
    removeChannel(c: unknown) {
      const i = canais.indexOf(c as never);
      if (i >= 0) canais.splice(i, 1);
    },
    rpc,
  };
  // insere um comando "no banco": chega em quem escuta postgres_changes da tabela
  const comando = (linha: Record<string, unknown>) => {
    for (const c of canais)
      for (const x of c.ouvintes) if (x.tipo === 'postgres_changes' && x.filtro.table === 'alerta_comandos') x.cb({ new: linha });
  };
  return { supabase, canais, rpc, comando };
});
vi.mock('../lib/supabase', () => ({ supabase: sb.supabase }));

import { useFilaAlertas } from './useFilaAlertas';
import { CHAVE_LOCAL, lerSalvo, usePlaylistAlertas, useControleRemoto } from './remoto';

const a = (id: string) => ({ id, tipo: 'superchat' as const, nome: id.toUpperCase(), valor: 'US$ 5.00', msg: 'oi' });

function fonteDoObs() {
  return renderHook(() => {
    const f = useFilaAlertas();
    useControleRemoto(f);
    return f;
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  sb.canais.length = 0;
  sb.rpc.mockClear();
});
afterEach(() => vi.useRealTimers());

describe('playlist remota', () => {
  it('o painel vê a fila da fonte do OBS, inclusive a que já estava aberta antes dele', () => {
    const obs = fonteDoObs();
    act(() => ['1', '2'].forEach((id) => obs.result.current.adicionar(a(id))));
    const painel = renderHook(() => usePlaylistAlertas());
    expect(painel.result.current.online).toBe(true);
    expect(painel.result.current.estado?.atual?.id).toBe('1');
    expect(painel.result.current.estado?.fila.map((x) => x.id)).toEqual(['2']);
    act(() => obs.result.current.adicionar(a('3')));
    expect(painel.result.current.estado?.fila.map((x) => x.id)).toEqual(['2', '3']);
  });

  it('comando do banco chega na fonte e ela obedece', () => {
    const obs = fonteDoObs();
    act(() => ['1', '2', '3'].forEach((id) => obs.result.current.adicionar(a(id))));
    act(() => sb.comando({ comando: 'remover', alvo: '2' }));
    expect(obs.result.current.fila.map((x) => x.id)).toEqual(['3']);
    act(() => sb.comando({ comando: 'pausar', alvo: null }));
    expect(obs.result.current.pausado).toBe(true);
    act(() => sb.comando({ comando: 'pular', alvo: null }));
    expect(obs.result.current.saindo).toBe(true);
    act(() => sb.comando({ comando: 'tocar', alvo: '1' }));
    expect(obs.result.current.fila.map((x) => x.id)).toEqual(['1', '3']);
    act(() => sb.comando({ comando: 'retomar', alvo: null }));
    expect(obs.result.current.pausado).toBe(false);
    act(() => sb.comando({ comando: 'explodir', alvo: null })); // desconhecido: ignora
  });

  it('o painel manda o comando pela função do banco e devolve o erro', async () => {
    const painel = renderHook(() => usePlaylistAlertas());
    await act(async () => {
      await painel.result.current.comando('tocar', 'yt-1');
    });
    expect(sb.rpc).toHaveBeenCalledWith('comando_alerta', { p_comando: 'tocar', p_alvo: 'yt-1' });
    sb.rpc.mockResolvedValueOnce({ data: null, error: { message: 'não autorizado' } });
    let erro: string | null = null;
    await act(async () => {
      erro = await painel.result.current.comando('pular');
    });
    expect(erro).toBe('não autorizado');
  });

  it('sem notícia da fonte por 15 s: fora do ar', () => {
    const painel = renderHook(() => usePlaylistAlertas());
    expect(painel.result.current.online).toBe(false);
    const obs = fonteDoObs();
    act(() => vi.advanceTimersByTime(1000));
    expect(painel.result.current.online).toBe(true);
    obs.unmount(); // fonte fechada
    act(() => vi.advanceTimersByTime(16000));
    expect(painel.result.current.online).toBe(false);
  });

  it('a fonte guarda fila, histórico e pausa no navegador (sobrevive à recarga do OBS)', () => {
    const obs = fonteDoObs();
    act(() => ['1', '2'].forEach((id) => obs.result.current.adicionar(a(id))));
    act(() => obs.result.current.pausar());
    const salvo = lerSalvo();
    expect(salvo?.pausado).toBe(true);
    expect(salvo?.fila.map((x) => x.id)).toEqual(['2']);
    expect(salvo?.historico.map((x) => x.id)).toEqual(['1']);
  });

  it('salvo estragado: ignora', () => {
    localStorage.setItem(CHAVE_LOCAL, '{lixo');
    expect(lerSalvo()).toBeNull();
    localStorage.setItem(CHAVE_LOCAL, JSON.stringify({ fila: 'x', historico: [], pausado: false }));
    expect(lerSalvo()).toBeNull();
  });
});
