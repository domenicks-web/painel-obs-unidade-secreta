import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ESTADO_PADRAO } from '../live/tipos';

const salvarDepois = vi.fn();
vi.mock('../live/useLive', () => ({
  SLUG: 'principal',
  useLive: () => ({ estado: { ...ESTADO_PADRAO, titulo: 'LIVE' }, status: 'ao_vivo', editadoPor: 'Ana', editadoEm: new Date().toISOString(), salvar: vi.fn(), salvarDepois, reiniciarContagem: vi.fn(), relogio: vi.fn() }),
}));
vi.mock('../live/useControlesLivePix', () => ({ useControlesLivePix: () => ({ status: 'ativo', ultimo: null, alternarPausa: vi.fn(), pular: vi.fn(), repetir: vi.fn(), limpar: vi.fn() }) }));
vi.mock('../chat/useChat', () => ({ useChat: () => ({ msgs: [], status: 'ao_vivo', adicionar: vi.fn(), limpar: vi.fn() }) }));
vi.mock('../live/useApoios', () => ({ useApoios: () => ({ lista: [], adicionarManual: vi.fn(), alternar: vi.fn() }) }));
vi.mock('../live/relogioServidor', () => ({ useAgora: () => Date.now(), RelogioServidorProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ papel: 'admin', sessao: {}, carregando: false, erro: null }) }));

import { PainelPage } from './PainelPage';

describe('PainelPage', () => {
  it('mostra as 11 telas, o aviso de prévia, status e editado por', () => {
    render(<MemoryRouter><PainelPage /></MemoryRouter>);
    expect(screen.getByText('PRÉVIA · NÃO É O QUE ESTÁ NO AR')).toBeInTheDocument();
    expect(screen.getByText('TELAS SINCRONIZADAS')).toBeInTheDocument();
    expect(screen.getByText(/editado por Ana/)).toBeInTheDocument();
    ['INÍCIO', 'HOST', 'FUTEBOL', 'FILME/SÉRIE', 'MESA REDONDA', 'JOGO', 'REACT', 'INTERVALO', 'LOWER THIRD', 'TÉCNICO', 'FIM'].forEach((t) =>
      expect(screen.getAllByText(t).length).toBeGreaterThan(0),
    );
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });

  it('título grava com atraso (salvarDepois)', () => {
    render(<MemoryRouter><PainelPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('TÍTULO DA LIVE · TODAS AS CENAS'), { target: { value: 'nova' } });
    expect(salvarDepois).toHaveBeenCalledWith({ titulo: 'NOVA' });
  });
});
