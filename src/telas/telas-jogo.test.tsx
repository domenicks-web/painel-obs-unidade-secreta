import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ESTADO_PADRAO } from '../live/tipos';

vi.mock('../live/relogioServidor', () => ({ useAgora: () => 2_000_000 }));

import { TelaFutebol } from './TelaFutebol';
import { TelaFilme } from './TelaFilme';

describe('futebol e filme', () => {
  it('placar, relógio rodando pelo servidor e rótulo OUTRO', () => {
    render(
      <TelaFutebol
        estado={{ ...ESTADO_PADRAO, timeA: 'FLA', timeB: 'VAS', golsA: 2, golsB: 1, clockRodando: true, clockInicio: 2_000_000 - 90_000, clockAcumulado: 600, jogo: 'OUTRO', jogoOutro: 'PÊNALTIS' }}
      />,
    );
    expect(screen.getAllByText('FLA').length).toBeGreaterThan(0);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText("11'")).toBeInTheDocument();
    expect(screen.getByText('PÊNALTIS')).toBeInTheDocument();
  });

  it('enquete escondida some inteira; mostrada usa os nomes dos times e não promete voto no chat', () => {
    const { rerender } = render(<TelaFutebol estado={{ ...ESTADO_PADRAO, enquete: { casa: 50, empate: 20, fora: 30, mostrar: false } }} />);
    expect(screen.queryByText('QUEM GANHA?')).toBeNull();
    rerender(<TelaFutebol estado={{ ...ESTADO_PADRAO, timeA: 'FLA', enquete: { casa: 50, empate: 20, fora: 30, mostrar: true } }} />);
    expect(screen.getByText('QUEM GANHA?')).toBeInTheDocument();
    expect(screen.getByText('EMPATE')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.queryByText(/VOTA NO CHAT/)).toBeNull();
  });

  it('câmeras 16:9 (640×360); sem enquete descem para o meio do espaço livre', () => {
    const cams = (c: HTMLElement) =>
      [...c.querySelectorAll<HTMLElement>('.t-slot')].map((e) => [e.style.left, e.style.top, e.style.width, e.style.height].join(' '));
    const semEnquete = { ...ESTADO_PADRAO, enquete: { casa: 0, empate: 0, fora: 0, mostrar: false } };
    const { container, rerender } = render(<TelaFutebol estado={semEnquete} />);
    expect(cams(container)).toEqual(['60px 370px 640px 360px', '740px 370px 640px 360px']);
    rerender(<TelaFutebol estado={{ ...semEnquete, enquete: { ...semEnquete.enquete, mostrar: true } }} />);
    expect(cams(container)).toEqual(['60px 200px 640px 360px', '740px 200px 640px 360px']);
  });

  it('Filme mostra 4 câmeras, filme e episódio', () => {
    render(<TelaFilme estado={{ ...ESTADO_PADRAO, filme: 'TITANIC', episodio: 'T2 · E1' }} />);
    expect(screen.getByText('TITANIC')).toBeInTheDocument();
    expect(screen.getByText('T2 · E1')).toBeInTheDocument();
    expect(screen.getByText('NOME 04')).toBeInTheDocument();
  });
});
