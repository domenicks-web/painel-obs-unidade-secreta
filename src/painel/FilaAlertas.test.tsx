import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FilaAlertas } from './FilaAlertas';
import type { EstadoRemoto } from '../alerta/remoto';

const al = (id: string, tipo: 'superchat' | 'sticker' | 'membro' = 'superchat') => ({ id, tipo, nome: id.toUpperCase(), valor: tipo === 'membro' ? undefined : 'US$ 5.00' });
const estado = (extra: Partial<EstadoRemoto> = {}): EstadoRemoto => ({
  instancia: 'x',
  pausado: false,
  atual: al('ana'),
  fila: [al('bia', 'sticker'), al('caio', 'membro')],
  historico: [{ ...al('ana'), tocadoEm: Date.now() }, { ...al('duda'), tocadoEm: Date.now() - 60000 }],
  ...extra,
});

function montar(e: EstadoRemoto | null, online = true) {
  const comando = vi.fn(async () => null as string | null);
  render(<FilaAlertas playlist={{ estado: e, online, comando }} />);
  return comando;
}

describe('FilaAlertas', () => {
  it('mostra o que toca, a fila e o que já tocou', () => {
    montar(estado());
    expect(screen.getByText('TOCANDO').parentElement!.textContent).toContain('ANA');
    expect(screen.getByText('NA FILA · 2')).toBeTruthy();
    expect(screen.getByText('JÁ TOCOU')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tocar BIA agora' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tocar DUDA de novo' })).toBeTruthy();
    // o que está tocando não aparece repetido no "já tocou"
    expect(screen.queryByRole('button', { name: 'Tocar ANA de novo' })).toBeNull();
  });

  it('botões mandam os comandos', async () => {
    const comando = montar(estado());
    fireEvent.click(screen.getByRole('button', { name: 'Tocar CAIO agora' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tirar BIA da fila' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tocar DUDA de novo' }));
    fireEvent.click(screen.getByRole('button', { name: 'PULAR' }));
    fireEvent.click(screen.getByRole('button', { name: 'PAUSAR FILA' }));
    await waitFor(() => expect(comando).toHaveBeenCalledTimes(5));
    expect(comando.mock.calls).toEqual([['tocar', 'caio'], ['remover', 'bia'], ['tocar', 'duda'], ['pular', undefined], ['pausar', undefined]]);
  });

  it('pausada: RETOMAR FILA', () => {
    const comando = montar(estado({ pausado: true, atual: null }));
    expect(screen.getByText('FILA PAUSADA')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'RETOMAR FILA' }));
    expect(comando).toHaveBeenCalledWith('retomar', undefined);
    expect((screen.getByRole('button', { name: 'PULAR' }) as HTMLButtonElement).disabled).toBe(true); // nada tocando
  });

  it('fonte fora do ar: avisa e trava os botões', () => {
    montar(null, false);
    expect(screen.getByText('FONTE FORA DO AR')).toBeTruthy();
    expect(screen.getByText(/\/alerta/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'PAUSAR FILA' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('erro do comando aparece', async () => {
    const comando = montar(estado());
    comando.mockResolvedValueOnce('não autorizado');
    fireEvent.click(screen.getByRole('button', { name: 'PULAR' }));
    expect(await screen.findByText('não autorizado')).toBeTruthy();
  });
});
