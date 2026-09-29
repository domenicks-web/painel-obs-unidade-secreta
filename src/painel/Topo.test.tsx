import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../lib/supabase', () => ({ supabase: { auth: { signOut: vi.fn() } } }));
vi.mock('../live/relogioServidor', () => ({ useAgora: () => Date.now() }));

import { Topo } from './Topo';

function montar(livepix: 'carregando' | 'ativo' | 'pausado' | 'erro') {
  render(
    <MemoryRouter>
      <Topo status="ao_vivo" editadoPor={null} editadoEm={null} ehAdmin={false} aoAbrirGalera={() => {}} livepix={livepix} />
    </MemoryRouter>,
  );
  return screen.getByText('LIVEPIX').closest('.p-status') as HTMLElement;
}

describe('Topo · selo LIVEPIX', () => {
  it('pausado fica violeta', () => {
    expect(montar('pausado').className).toContain('p-status--violeta');
  });
  it('ativo fica aceso, sem "EM BREVE"', () => {
    const selo = montar('ativo');
    expect(selo.querySelector('.p-status__led--aceso')).not.toBeNull();
    expect(selo.textContent).not.toContain('EM BREVE');
  });
  it('sem conexão avisa', () => {
    expect(montar('erro').textContent).toContain('SEM CONEXÃO');
  });
});
