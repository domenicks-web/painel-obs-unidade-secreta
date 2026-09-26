import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { SecaoAlerta } from './SecaoAlerta';

describe('SecaoAlerta', () => {
  it('dispara um evento de teste ao clicar no botão', () => {
    const disparar = vi.fn();
    render(<SecaoAlerta disparar={disparar} />);
    fireEvent.click(screen.getByText('DISPARAR ALERTA DE TESTE'));
    expect(disparar).toHaveBeenCalledWith({ nome: 'TESTE', mensagem: 'Isso é só um teste do alerta 🎉' });
  });
});
