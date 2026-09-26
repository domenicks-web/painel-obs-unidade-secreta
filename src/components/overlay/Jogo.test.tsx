import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Jogo } from './Jogo';
import { ESTADO_PADRAO } from '../../types/estado';

describe('Jogo', () => {
  it('mostra os times, o placar e quem está no ar', () => {
    render(
      <Jogo
        estado={{
          ...ESTADO_PADRAO,
          timeA: 'RUBRO',
          timeB: 'AZUL',
          golsA: 2,
          golsB: 1,
          jogo: 'FIFA · RODADA 3',
          noAr: [0, 1],
        }}
      />,
    );
    expect(screen.getByText('RUBRO')).toBeInTheDocument();
    expect(screen.getByText('AZUL')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('FIFA · RODADA 3')).toBeInTheDocument();
    expect(screen.getByText('NO AR · 2')).toBeInTheDocument();
    expect(screen.getByText('NOME 01')).toBeInTheDocument();
    expect(screen.getByText('NOME 02')).toBeInTheDocument();
  });
});
