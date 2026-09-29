import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ESTADO_PADRAO } from '../live/tipos';
import { ColunaPix } from './ColunaPix';

const lista = [
  { id: 'a', nome: 'TIAGÃO', valor: 25.5, msg: 'pra pizza', origem: 'manual', externo_id: null, off: false, created_at: '' },
  { id: 'b', nome: 'CAROL', valor: 10, msg: '', origem: 'livepix', externo_id: 'x', off: true, created_at: '' },
];

function montar() {
  const live = { estado: { ...ESTADO_PADRAO, metaAtual: 250, metaTotal: 500 }, salvarDepois: vi.fn() } as never;
  const pix = { lista, adicionarManual: vi.fn().mockResolvedValue(null), alternar: vi.fn() } as never;
  render(<ColunaPix live={live} pix={pix} />);
  return { live: live as { salvarDepois: ReturnType<typeof vi.fn> }, pix: pix as { adicionarManual: ReturnType<typeof vi.fn>; alternar: ReturnType<typeof vi.fn> } };
}

describe('ColunaPix', () => {
  it('mostra meta, lista com origem e alterna contar/não contar', () => {
    const { pix } = montar();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('R$ 25,50')).toBeInTheDocument();
    expect(screen.getByText('MANUAL')).toBeInTheDocument();
    expect(screen.getByText('LIVEPIX')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Voltar a contar'));
    expect(pix.alternar).toHaveBeenCalledWith('b');
  });

  it('PIX manual aceita vírgula e limpa depois', async () => {
    const { pix } = montar();
    fireEvent.change(screen.getByPlaceholderText('NOME (PIX MANUAL)'), { target: { value: 'duda' } });
    fireEvent.change(screen.getByPlaceholderText('R$'), { target: { value: '7,5' } });
    fireEvent.click(screen.getByText('+ ADD'));
    await waitFor(() => expect(pix.adicionarManual).toHaveBeenCalledWith('DUDA', 7.5));
    await waitFor(() => expect((screen.getByPlaceholderText('R$') as HTMLInputElement).value).toBe(''));
  });

  it('PIX manual sem valor não chama o banco e avisa', () => {
    const { pix } = montar();
    fireEvent.change(screen.getByPlaceholderText('NOME (PIX MANUAL)'), { target: { value: 'duda' } });
    fireEvent.click(screen.getByText('+ ADD'));
    expect(pix.adicionarManual).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('apagar ou zerar a META não grava; ao sair do campo volta o último valor válido', () => {
    const { live } = montar();
    const meta = screen.getByLabelText('META R$') as HTMLInputElement;
    fireEvent.focus(meta);
    fireEvent.change(meta, { target: { value: '' } });
    fireEvent.change(meta, { target: { value: '0' } });
    fireEvent.change(meta, { target: { value: 'abc' } });
    expect(live.salvarDepois).not.toHaveBeenCalled();
    fireEvent.change(meta, { target: { value: '750,5' } });
    expect(live.salvarDepois).toHaveBeenLastCalledWith({ metaTotal: 750.5 });
    fireEvent.change(meta, { target: { value: '' } });
    fireEvent.blur(meta);
    expect(meta.value).toBe('500');
  });

  it('ajuste com vírgula grava número', () => {
    const { live } = montar();
    fireEvent.change(screen.getByLabelText('AJUSTE R$'), { target: { value: '-5,5' } });
    expect(live.salvarDepois).toHaveBeenLastCalledWith({ ajuste: -5.5 });
  });
});
