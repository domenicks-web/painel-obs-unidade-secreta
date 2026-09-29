import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ControlesLivePix } from './ControlesLivePix';
import type { ControlesLivePix as Controles } from '../live/useControlesLivePix';

function controles(extra: Partial<Controles> = {}): Controles {
  return {
    status: 'ativo',
    ultimo: null,
    alternarPausa: vi.fn().mockResolvedValue(true),
    pular: vi.fn().mockResolvedValue(true),
    repetir: vi.fn().mockResolvedValue(true),
    limpar: vi.fn().mockResolvedValue(true),
    ...extra,
  };
}

afterEach(() => vi.useRealTimers());

describe('ControlesLivePix', () => {
  it('ativo: 4 botões e nenhuma faixa', () => {
    render(<ControlesLivePix controles={controles()} />);
    const nomes = screen.getAllByRole('button').map((b) => b.textContent);
    expect(nomes).toEqual(['PAUSAR ALERTAS', 'PULAR', 'REPETIR', 'LIMPAR FILA']);
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

  it('LIMPAR FILA pergunta "Limpar fila?" antes; cancelar não limpa', async () => {
    const c = controles();
    render(<ControlesLivePix controles={c} />);
    fireEvent.click(screen.getByRole('button', { name: 'LIMPAR FILA' }));
    expect(c.limpar).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog', { name: 'Limpar fila?' })).toHaveTextContent('LIMPAR FILA?');
    fireEvent.click(screen.getByRole('button', { name: 'CANCELAR' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(c.limpar).not.toHaveBeenCalled();
  });

  it('LIMPAR FILA confirmado chama limpar e fecha a pergunta', async () => {
    const c = controles();
    render(<ControlesLivePix controles={c} />);
    fireEvent.click(screen.getByRole('button', { name: 'LIMPAR FILA' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'LIMPAR' }));
    });
    expect(c.limpar).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).toBeNull();
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

  it('limpar que falha marca o botão LIMPAR FILA', async () => {
    render(<ControlesLivePix controles={controles({ limpar: vi.fn().mockResolvedValue(false) })} />);
    fireEvent.click(screen.getByRole('button', { name: 'LIMPAR FILA' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'LIMPAR' }));
    });
    expect(screen.getByText('FALHOU · TENTA DE NOVO')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'LIMPAR FILA' }).className).toContain('p-livepix__botao--falhou');
  });
});
