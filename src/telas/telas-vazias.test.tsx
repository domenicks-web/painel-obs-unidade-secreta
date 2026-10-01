import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { ESTADO_PADRAO } from '../live/tipos';
import { TELA_COMPONENTE } from '.';

describe('telas vazias (JOGO e REACT)', () => {
  it.each(['jogo', 'react'] as const)('%s: só as molduras, fundo transparente', (id) => {
    const Tela = TELA_COMPONENTE[id];
    const { container } = render(<Tela estado={ESTADO_PADRAO} />);
    const raiz = container.firstElementChild as HTMLElement;
    expect(raiz.className).toBe('t-vazia');
    expect(container.querySelectorAll('.t-slot')).toHaveLength(2);
    expect(container.querySelector('.t-ticker, .t-topo')).toBeNull();
  });
  it('layout editado vale', () => {
    const Tela = TELA_COMPONENTE.react;
    const { container } = render(<Tela estado={{ ...ESTADO_PADRAO, camsReact: [] }} />);
    expect(container.querySelectorAll('.t-slot')).toHaveLength(0);
  });
});
