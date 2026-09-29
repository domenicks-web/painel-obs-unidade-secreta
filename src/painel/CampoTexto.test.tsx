import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CampoTexto } from './CampoTexto';

describe('CampoTexto', () => {
  it('converte pra maiúsculas e avisa a cada tecla', () => {
    const aoMudar = vi.fn();
    render(<CampoTexto valor="" aoMudar={aoMudar} maiusculo rotulo="TÍTULO" />);
    fireEvent.change(screen.getByLabelText('TÍTULO'), { target: { value: 'abc' } });
    expect(aoMudar).toHaveBeenLastCalledWith('ABC');
  });

  it('com foco, ignora valor novo vindo de fora; sem foco, acompanha', () => {
    const { rerender } = render(<CampoTexto valor="A" aoMudar={() => {}} rotulo="X" />);
    const input = screen.getByLabelText('X') as HTMLInputElement;
    input.focus();
    fireEvent.change(input, { target: { value: 'MEU' } });
    rerender(<CampoTexto valor="ECO VELHO" aoMudar={() => {}} rotulo="X" />);
    expect(input.value).toBe('MEU');
    input.blur();
    rerender(<CampoTexto valor="SERVIDOR" aoMudar={() => {}} rotulo="X" />);
    expect(input.value).toBe('SERVIDOR');
  });
});
