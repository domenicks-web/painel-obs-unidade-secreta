import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ESTADO_PADRAO } from '../live/tipos';
import { TelaHost } from './TelaHost';
import { TelaMesa } from './TelaMesa';
import { TelaLower } from './TelaLower';

const nomes = ['ANA', 'BIA', 'CAIO', 'DUDA', 'EDU', 'FÁBIO'];

describe('telas com câmeras', () => {
  it('Host com 1 câmera mostra PIX link, meta, último e top formatados', () => {
    render(<TelaHost estado={{ ...ESTADO_PADRAO, nomes, hostCams: '1', metaAtual: 250.5, metaTotal: 500, pixNome: 'CAROL', pixValor: 10.5, topNome: 'TIAGO', topValor: 50 }} />);
    expect(screen.getByText('ANA')).toBeInTheDocument();
    expect(screen.queryByText('BIA')).toBeNull();
    expect(screen.getByText('R$ 250,50')).toBeInTheDocument();
    expect(screen.getAllByText('50%').length).toBeGreaterThan(0);
    expect(screen.getByText('CAROL')).toBeInTheDocument();
    expect(screen.getByText('R$ 10,50')).toBeInTheDocument();
    expect(screen.getByText('TIAGO')).toBeInTheDocument();
    expect(screen.getByText(/LIVEPIX\.GG\//)).toBeInTheDocument();
    expect(screen.queryByText('QR CODE')).toBeNull();
  });

  it('Host com 3 câmeras mostra 3 nomes e esconde a caixa do PIX', () => {
    const { container } = render(<TelaHost estado={{ ...ESTADO_PADRAO, nomes, hostCams: '3' }} />);
    ['ANA', 'BIA', 'CAIO'].forEach((n) => expect(screen.getByText(n)).toBeInTheDocument());
    // o letreiro padrão também tem "MANDA O PIX", então confere pela caixa
    expect(container.querySelector('.t-host__pix')).toBeNull();
  });

  it('meta acima de 100% trava a barra em 100%', () => {
    const { container } = render(<TelaHost estado={{ ...ESTADO_PADRAO, metaAtual: 900, metaTotal: 500 }} />);
    expect((container.querySelector('.t-host__meta-barra-cheia') as HTMLElement).style.width).toBe('100%');
  });

  it('meta com centavos ou 4 dígitos usa fonte menor pra caber numa linha', () => {
    const { container, rerender } = render(<TelaHost estado={{ ...ESTADO_PADRAO, metaAtual: 320 }} />);
    const valor = () => container.querySelector('.t-host__meta-atual') as HTMLElement;
    expect(valor().className).not.toContain('--menor');
    rerender(<TelaHost estado={{ ...ESTADO_PADRAO, metaAtual: 999.5 }} />);
    expect(valor().className).toContain('t-host__meta-atual--menor');
    rerender(<TelaHost estado={{ ...ESTADO_PADRAO, metaAtual: 1250.5 }} />);
    expect(valor().className).toContain('t-host__meta-atual--minima');
    rerender(<TelaHost estado={{ ...ESTADO_PADRAO, metaAtual: 12500.5 }} />);
    expect(valor().className).toContain('t-host__meta-atual--micro');
  });

  it('Mesa mostra as 6 câmeras', () => {
    render(<TelaMesa estado={{ ...ESTADO_PADRAO, nomes }} />);
    nomes.forEach((n) => expect(screen.getByText(n)).toBeInTheDocument());
  });

  it('Lower usa ltNome e funcao, não nomes[0]', () => {
    render(<TelaLower estado={{ ...ESTADO_PADRAO, nomes, ltNome: 'CONVIDADO', funcao: 'ZAGUEIRO' }} />);
    expect(screen.getByText('CONVIDADO')).toBeInTheDocument();
    expect(screen.getByText('ZAGUEIRO')).toBeInTheDocument();
    expect(screen.queryByText('ANA')).toBeNull();
  });
});
