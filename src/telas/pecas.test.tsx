import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Letreiro } from './Letreiro';
import { SlotCamera } from './SlotCamera';
import { FaixaTicker } from './FaixaTicker';

describe('peças das telas', () => {
  it('Letreiro põe uma bolinha CSS depois de cada item (sem caractere ●)', () => {
    const { container } = render(<Letreiro itens={['A', 'B']} />);
    expect(container.querySelectorAll('.us-ponto')).toHaveLength(2);
    expect(container.textContent).not.toContain('●');
  });

  it('SlotCamera mostra o nome; placeholder só na prévia', () => {
    const { rerender } = render(<SlotCamera nome="ANA" w={924} h={520} x={60} y={150} />);
    expect(screen.getByText('ANA')).toBeInTheDocument();
    expect(screen.queryByText('CÂMERA · 924×520')).toBeNull();
    rerender(<SlotCamera nome="ANA" w={924} h={520} x={60} y={150} previa />);
    expect(screen.getByText('CÂMERA · 924×520')).toBeInTheDocument();
  });

  it('FaixaTicker repete os itens 4x como a referência', () => {
    const { container } = render(<FaixaTicker ticker="UM ● DOIS" />);
    expect(container.querySelectorAll('.us-ponto')).toHaveLength(8);
  });
});
