import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Intervalo } from './Intervalo';
import { ESTADO_PADRAO } from '../../types/estado';

describe('Intervalo', () => {
  it('mostra a mensagem do intervalo', () => {
    render(<Intervalo estado={{ ...ESTADO_PADRAO, msg: 'JÁ VOLTAMOS' }} />);
    expect(screen.getByText('JÁ VOLTAMOS')).toBeInTheDocument();
    expect(screen.getByText('INTERVALO')).toBeInTheDocument();
  });
});
