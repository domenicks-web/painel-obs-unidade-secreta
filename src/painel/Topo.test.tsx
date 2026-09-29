import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../lib/supabase', () => ({ supabase: { auth: { signOut: vi.fn() } } }));
vi.mock('../live/relogioServidor', () => ({ useAgora: () => Date.now() }));

import { Topo } from './Topo';
import type { UltimoComando } from '../live/useControlesLivePix';

function montar(livepix: 'carregando' | 'ativo' | 'pausado' | 'erro', ultimo: UltimoComando | null = null) {
  render(
    <MemoryRouter>
      <Topo status="ao_vivo" editadoPor={null} editadoEm={null} ehAdmin={false} aoAbrirGalera={() => {}} livepix={livepix} livepixUltimo={ultimo} />
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
  it('mostra o último comando dado, com quem e quando na dica', () => {
    const selo = montar('ativo', { comando: 'pular', por: 'Ana', em: new Date().toISOString() });
    expect(selo.textContent).toContain('PULOU');
    expect(selo.title).toMatch(/^Último comando: PULOU, por Ana, /);
  });
  it('pausado com outro comando depois: PAUSADO · FILA LIMPA', () => {
    const selo = montar('pausado', { comando: 'limpar', por: 'Ana', em: new Date().toISOString() });
    expect(selo.textContent).toContain('PAUSADO · FILA LIMPA');
  });
  it('pausado pelo próprio pausar: só PAUSADO', () => {
    const selo = montar('pausado', { comando: 'pausar', por: 'Ana', em: new Date().toISOString() });
    expect(selo.querySelector('.p-status__extra')!.textContent).toBe('PAUSADO');
  });
});
