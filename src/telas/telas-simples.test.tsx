import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ESTADO_PADRAO } from '../live/tipos';

vi.mock('../live/relogioServidor', () => ({ useAgora: () => 1_000_000 + 61_000 }));

import { TelaInicio } from './TelaInicio';
import { TelaIntervalo } from './TelaIntervalo';
import { TelaFim } from './TelaFim';
import { TelaTecnico } from './TelaTecnico';

afterEach(() => vi.clearAllMocks());

describe('telas simples', () => {
  it('Início mostra título e countdown do servidor', () => {
    render(<TelaInicio estado={{ ...ESTADO_PADRAO, titulo: 'LIVE X', minutos: 5, timerInicio: 1_000_000 }} />);
    expect(screen.getByText('LIVE X')).toBeInTheDocument();
    expect(screen.getByText('03:59')).toBeInTheDocument();
    expect(screen.getByText('A LIVE JÁ VAI COMEÇAR')).toBeInTheDocument();
  });

  it('Início parado mostra o total', () => {
    render(<TelaInicio estado={{ ...ESTADO_PADRAO, minutos: 10, timerInicio: null }} />);
    expect(screen.getByText('10:00')).toBeInTheDocument();
  });

  it('Intervalo escreve a frase letra a letra e o countdown', () => {
    const { container } = render(<TelaIntervalo estado={{ ...ESTADO_PADRAO, msg: 'JÁ', minutos: 5, timerInicio: 1_000_000 }} />);
    expect(container.querySelectorAll('.t-intervalo__letra')).toHaveLength(2);
    expect(screen.getByText('03:59')).toBeInTheDocument();
  });

  it('Fim mostra a próxima live', () => {
    render(<TelaFim estado={{ ...ESTADO_PADRAO, proximo: 'SÁBADO, 20H' }} />);
    expect(screen.getByText('SÁBADO, 20H')).toBeInTheDocument();
  });

  it('Técnico mostra DEU RUIM', () => {
    render(<TelaTecnico estado={ESTADO_PADRAO} />);
    expect(screen.getAllByText('DEU RUIM')).toHaveLength(3);
  });
});
