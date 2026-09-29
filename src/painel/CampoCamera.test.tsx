import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CampoCamera } from './CampoCamera';

const galera = [
  { id: '1', nome: 'ANA', funcao: 'HOST' },
  { id: '2', nome: 'ANDERSON', funcao: 'CAMERA' },
  { id: '3', nome: 'BIA', funcao: 'CONVIDADA' },
];

describe('CampoCamera', () => {
  it('filtra a galera enquanto digita e escolhe com clique', () => {
    const aoMudar = vi.fn();
    render(<CampoCamera numero={1} valor="" galera={galera} aoMudar={aoMudar} />);
    const input = screen.getByLabelText('CÂMERA 01');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'an' } });
    expect(screen.getByRole('option', { name: 'ANA' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'ANDERSON' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'BIA' })).toBeNull();
    fireEvent.mouseDown(screen.getByRole('option', { name: 'ANDERSON' }));
    expect(aoMudar).toHaveBeenLastCalledWith('ANDERSON');
  });

  it('aceita nome livre e escolhe com teclado', () => {
    const aoMudar = vi.fn();
    render(<CampoCamera numero={2} valor="" galera={galera} aoMudar={aoMudar} />);
    const input = screen.getByLabelText('CÂMERA 02');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'convidado x' } });
    expect(aoMudar).toHaveBeenLastCalledWith('CONVIDADO X');
    fireEvent.change(input, { target: { value: 'b' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(aoMudar).toHaveBeenLastCalledWith('BIA');
  });
});
