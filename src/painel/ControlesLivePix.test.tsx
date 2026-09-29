import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ControlesLivePix } from './ControlesLivePix';
import type { ControlesLivePix as Controles } from '../live/useControlesLivePix';

function controles(extra: Partial<Controles> = {}): Controles {
  return {
    status: 'ativo',
    alternarPausa: vi.fn().mockResolvedValue(true),
    pular: vi.fn().mockResolvedValue(true),
    repetir: vi.fn().mockResolvedValue(true),
    ...extra,
  };
}

afterEach(() => vi.useRealTimers());

describe('ControlesLivePix', () => {
  it('ativo: PAUSAR ALERTAS, PULAR, REPETIR e nenhuma faixa', () => {
    render(<ControlesLivePix controles={controles()} />);
    expect(screen.getByRole('button', { name: 'PAUSAR ALERTAS' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PULAR' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'REPETIR' })).toBeInTheDocument();
    expect(screen.queryByText('ALERTAS PAUSADOS · FILA SEGURANDO')).toBeNull();
  });

  it('pausado: botão vira RETOMAR (violeta) e a faixa avisa', () => {
    render(<ControlesLivePix controles={controles({ status: 'pausado' })} />);
    const botao = screen.getByRole('button', { name: 'RETOMAR' });
    expect(botao.className).toContain('p-livepix__botao--pausado');
    expect(screen.getByText('ALERTAS PAUSADOS · FILA SEGURANDO')).toBeInTheDocument();
  });

  it('cada botão chama a sua ação', async () => {
    const c = controles();
    render(<ControlesLivePix controles={c} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'PAUSAR ALERTAS' }));
      fireEvent.click(screen.getByRole('button', { name: 'PULAR' }));
      fireEvent.click(screen.getByRole('button', { name: 'REPETIR' }));
    });
    expect(c.alternarPausa).toHaveBeenCalled();
    expect(c.pular).toHaveBeenCalled();
    expect(c.repetir).toHaveBeenCalled();
  });

  it('falhou: mostra "FALHOU · TENTA DE NOVO" no lugar da faixa por 3 s', async () => {
    vi.useFakeTimers();
    render(<ControlesLivePix controles={controles({ status: 'pausado', pular: vi.fn().mockResolvedValue(false) })} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'PULAR' }));
    });
    expect(screen.getByText('FALHOU · TENTA DE NOVO')).toBeInTheDocument();
    expect(screen.queryByText('ALERTAS PAUSADOS · FILA SEGURANDO')).toBeNull();
    expect(screen.getByRole('button', { name: 'PULAR' }).className).toContain('p-livepix__botao--falhou');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(screen.queryByText('FALHOU · TENTA DE NOVO')).toBeNull();
    expect(screen.getByText('ALERTAS PAUSADOS · FILA SEGURANDO')).toBeInTheDocument();
  });
});
