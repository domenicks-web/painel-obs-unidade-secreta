import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SecaoMembros } from './SecaoMembros';
import { ESTADO_PADRAO } from '../../types/estado';

describe('SecaoMembros', () => {
  it('alterna o membro 3 para "no ar"', () => {
    const atualizar = vi.fn();
    render(<SecaoMembros estado={ESTADO_PADRAO} atualizar={atualizar} />);
    const botoesNoAr = screen.getAllByText('NO AR');
    fireEvent.click(botoesNoAr[3]); // membro índice 3, ainda não estava no ar (noAr padrão é [0,1,2])
    expect(atualizar).toHaveBeenCalledWith({ noAr: [0, 1, 2, 3] });
  });

  it('mostra o lower third do membro clicado por ltSeg segundos', () => {
    const atualizar = vi.fn();
    render(<SecaoMembros estado={ESTADO_PADRAO} atualizar={atualizar} />);
    const botoesMostrar = screen.getAllByText('MOSTRAR');
    const antes = Date.now();
    fireEvent.click(botoesMostrar[2]);
    const chamada = atualizar.mock.calls[0][0];
    expect(chamada.lt).toBe(2);
    expect(chamada.ltAte).toBeGreaterThanOrEqual(antes + ESTADO_PADRAO.ltSeg * 1000);
  });

  it('esconde o nome atual', () => {
    const atualizar = vi.fn();
    render(<SecaoMembros estado={ESTADO_PADRAO} atualizar={atualizar} />);
    fireEvent.click(screen.getByText('ESCONDER NOME'));
    expect(atualizar).toHaveBeenCalledWith({ ltAte: 0 });
  });
});
