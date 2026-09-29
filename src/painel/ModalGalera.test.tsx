import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ModalGalera } from './ModalGalera';

describe('ModalGalera', () => {
  it('adiciona, edita em maiúsculas e remove', () => {
    const aoSalvar = vi.fn();
    const { rerender } = render(<ModalGalera galera={[]} aoSalvar={aoSalvar} aoFechar={() => {}} />);
    fireEvent.click(screen.getByText('+ ADICIONAR'));
    const nova = aoSalvar.mock.calls[0][0];
    expect(nova).toHaveLength(1);
    rerender(<ModalGalera galera={nova} aoSalvar={aoSalvar} aoFechar={() => {}} />);
    fireEvent.change(screen.getByLabelText('NOME 1'), { target: { value: 'ana' } });
    expect(aoSalvar).toHaveBeenLastCalledWith([{ ...nova[0], nome: 'ANA' }]);
    fireEvent.click(screen.getByTitle('Remover'));
    expect(aoSalvar).toHaveBeenLastCalledWith([]);
  });

  it('trava em 20', () => {
    const g = Array.from({ length: 20 }, (_, i) => ({ id: String(i), nome: `P${i}`, funcao: '' }));
    render(<ModalGalera galera={g} aoSalvar={vi.fn()} aoFechar={() => {}} />);
    expect(screen.getByText('LIMITE DE 20')).toBeDisabled();
    expect(screen.getByText('20/20')).toBeInTheDocument();
  });

  it('Esc fecha', () => {
    const aoFechar = vi.fn();
    render(<ModalGalera galera={[]} aoSalvar={vi.fn()} aoFechar={aoFechar} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(aoFechar).toHaveBeenCalled();
  });
});
