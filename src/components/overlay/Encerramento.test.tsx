import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Encerramento } from './Encerramento';
import { ESTADO_PADRAO } from '../../types/estado';

describe('Encerramento', () => {
  it('mostra o próximo episódio', () => {
    render(<Encerramento estado={{ ...ESTADO_PADRAO, proximo: 'SÁBADO, 20H' }} />);
    expect(screen.getByText('SÁBADO, 20H')).toBeInTheDocument();
    expect(screen.getByText('PRÓXIMO EPISÓDIO')).toBeInTheDocument();
  });
});
