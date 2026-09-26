import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Dots } from './Dots';

describe('Dots', () => {
  it('renderiza dez pontos', () => {
    const { container } = render(<Dots variante="acende" />);
    expect(container.querySelectorAll('.dots__item')).toHaveLength(10);
  });

  it('usa a animação "respira" quando a variante é respira', () => {
    const { container } = render(<Dots variante="respira" />);
    const primeiro = container.querySelector('.dots__item') as HTMLElement;
    expect(primeiro.style.animation).toContain('respira');
  });
});
