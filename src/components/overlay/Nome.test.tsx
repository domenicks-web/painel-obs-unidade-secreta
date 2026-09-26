import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Nome } from './Nome';
import { ESTADO_PADRAO } from '../../types/estado';

describe('Nome', () => {
  it('mostra o nome em destaque quando dentro da janela de tempo', () => {
    render(<Nome estado={{ ...ESTADO_PADRAO, lt: 0, ltAte: 20_000 }} agoraServidor={10_000} />);
    expect(screen.getByText('NOME 01')).toBeInTheDocument();
    expect(screen.getByText('UNIDADE SECRETA')).toBeInTheDocument();
  });

  it('fica fora da tela quando o tempo expirou', () => {
    const { container } = render(<Nome estado={{ ...ESTADO_PADRAO, lt: 0, ltAte: 5_000 }} agoraServidor={10_000} />);
    const raiz = container.querySelector('.nome') as HTMLElement;
    expect(raiz.style.opacity).toBe('0');
  });
});
