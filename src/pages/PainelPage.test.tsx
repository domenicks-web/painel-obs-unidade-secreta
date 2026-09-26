import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PainelPage } from './PainelPage';
import { ESTADO_PADRAO } from '../types/estado';

const atualizar = vi.fn();

vi.mock('../hooks/useSala', () => ({
  useSala: () => ({ estado: ESTADO_PADRAO, status: 'ao_vivo', updatedAt: '2026-01-01T00:00:00Z', updatedByNome: 'FULANO', atualizar }),
}));
vi.mock('../hooks/useServerClock', () => ({ useServerClock: () => 1_000_000 }));
vi.mock('../hooks/useEventos', () => ({ useEventos: () => ({ ultimoEvento: null, recebidoEm: null, disparar: vi.fn() }) }));

function renderPainel() {
  return render(
    <MemoryRouter>
      <PainelPage />
    </MemoryRouter>,
  );
}

describe('PainelPage', () => {
  it('atualiza o título ao digitar', () => {
    renderPainel();
    const campo = screen.getByPlaceholderText('Título da live');
    fireEvent.change(campo, { target: { value: 'NOVO TÍTULO' } });
    expect(atualizar).toHaveBeenCalledWith({ titulo: 'NOVO TÍTULO' });
  });

  it('incrementa o placar do time A', () => {
    renderPainel();
    const botoesMais = screen.getAllByText('+');
    fireEvent.click(botoesMais[0]);
    expect(atualizar).toHaveBeenCalledWith({ golsA: 1 });
  });

  it('mostra quem editou por último', () => {
    renderPainel();
    expect(screen.getByText(/editado por FULANO/)).toBeInTheDocument();
  });
});
