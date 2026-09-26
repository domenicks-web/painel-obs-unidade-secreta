import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Comecando } from './Comecando';
import { ESTADO_PADRAO } from '../../types/estado';

describe('Comecando', () => {
  it('mostra o título e a contagem regressiva formatada', () => {
    render(<Comecando estado={{ ...ESTADO_PADRAO, titulo: 'RESENHA DE SEXTA' }} restanteMs={65_000} />);
    expect(screen.getByText('RESENHA DE SEXTA')).toBeInTheDocument();
    expect(screen.getByText('01:05')).toBeInTheDocument();
    expect(screen.getByText('A TRANSMISSÃO COMEÇA EM')).toBeInTheDocument();
  });

  it('mostra "JÁ" e "VAI COMEÇAR" quando a contagem termina', () => {
    render(<Comecando estado={{ ...ESTADO_PADRAO, fim: 1 }} restanteMs={0} />);
    expect(screen.getByText('JÁ')).toBeInTheDocument();
    expect(screen.getByText('VAI COMEÇAR')).toBeInTheDocument();
  });
});
