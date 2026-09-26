import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { OverlayPage } from './OverlayPage';
import { ESTADO_PADRAO } from '../types/estado';

vi.mock('../hooks/useSala', () => ({
  useSala: () => ({ estado: { ...ESTADO_PADRAO, timeA: 'RUBRO' }, status: 'ao_vivo', updatedAt: undefined, updatedByNome: null, atualizar: vi.fn() }),
}));
vi.mock('../hooks/useServerClock', () => ({ useServerClock: () => 1_000_000 }));
vi.mock('../hooks/useEventos', () => ({ useEventos: () => ({ ultimoEvento: null, recebidoEm: null, disparar: vi.fn() }) }));

function renderRota(cena: string) {
  return render(
    <MemoryRouter initialEntries={[`/overlay/${cena}?sala=principal`]}>
      <Routes>
        <Route path="/overlay/:cena" element={<OverlayPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('OverlayPage', () => {
  it('renderiza a cena de jogo com o estado da sala', () => {
    renderRota('jogo');
    expect(screen.getByText('RUBRO')).toBeInTheDocument();
  });

  it('renderiza a cena de começando', () => {
    renderRota('comecando');
    expect(screen.getByText('A TRANSMISSÃO COMEÇA EM')).toBeInTheDocument();
  });
});
