import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ESTADO_PADRAO, type EstadoLive } from '../live/tipos';
import { TIMES_EXEMPLO } from '../escalacao/exemplo';
import type { Time } from '../escalacao/times';

const salvarTime = vi.fn(async (_t: unknown) => null as string | null);
const excluirTime = vi.fn(async (_id: string) => null as string | null);
let cadastro: Time[] = TIMES_EXEMPLO;
vi.mock('../escalacao/useTimes', () => ({
  useTimes: () => ({ times: cadastro, carregado: true, salvarTime, excluirTime }),
  TimesProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('../live/relogioServidor', () => ({ useAgora: () => 0, useOffsetServidor: () => 0 }));

import { CamposTela } from './CamposTela';
import { ModalTimes } from './ModalTimes';
import { ArrastarJogadores } from './ArrastarJogadores';
import { TelaEscalacao, timesEscalados } from '../telas/TelaEscalacao';
import { centrosNoCampo, CAMPO } from '../escalacao/layout';

function live(extra: Partial<EstadoLive> = {}) {
  return {
    estado: { ...ESTADO_PADRAO, ...extra },
    salvar: vi.fn(),
    salvarDepois: vi.fn(),
  } as never as { estado: EstadoLive; salvar: ReturnType<typeof vi.fn>; salvarDepois: ReturnType<typeof vi.fn> };
}

const opcoes = () => ({ editandoPosicoes: false, aoEditarPosicoes: vi.fn(), aoAbrirTimes: vi.fn() });

afterEach(() => {
  vi.restoreAllMocks();
  salvarTime.mockClear();
  cadastro = TIMES_EXEMPLO;
});

describe('campos da ESCALAÇÃO', () => {
  it('modo e times voltam as câmeras pro automático', () => {
    const l = live();
    render(<CamposTela tela="escalacao" live={l as never} escalacao={opcoes()} />);
    fireEvent.click(screen.getByRole('button', { name: 'CAMPO' }));
    expect(l.salvar).toHaveBeenCalledWith({ escModo: 'campo', camsEscalacao: null });
    fireEvent.click(screen.getByRole('button', { name: 'CASA E VISITANTE' }));
    expect(l.salvar).toHaveBeenCalledWith({ escTimes: 'ambos', camsEscalacao: null });
  });

  it('câmeras de 2 a 6: grava a quantidade e volta pro automático', () => {
    const l = live({ escCams: 4 });
    render(<CamposTela tela="escalacao" live={l as never} escalacao={opcoes()} />);
    expect(screen.queryByRole('button', { name: '1 CÂMERAS' })).toBeNull();
    expect(screen.getByRole('button', { name: '4 CÂMERAS' }).className).toContain('p-opcao--ativa');
    fireEvent.click(screen.getByRole('button', { name: '6 CÂMERAS' }));
    expect(l.salvar).toHaveBeenCalledWith({ escCams: 6, camsEscalacao: null });
  });

  it('só aparece o lado em uso; escolher o time leva o nome pro placar', () => {
    const l = live({ escTimes: 'visitante' });
    render(<CamposTela tela="escalacao" live={l as never} escalacao={opcoes()} />);
    expect(screen.queryByLabelText('TIME CASA')).toBeNull();
    fireEvent.change(screen.getByLabelText('TIME VISITANTE'), { target: { value: 'palmeiras' } });
    expect(l.salvar).toHaveBeenCalledWith({ escTimeVisitId: 'palmeiras', timeB: 'PALMEIRAS' });
  });

  it('time sem 11 titulares fica desabilitado no select', () => {
    cadastro = [...TIMES_EXEMPLO, { id: 'x', nome: 'INCOMPLETO', sigla: '', tecnico: '', cor: null, jogadores: TIMES_EXEMPLO[0].jogadores.slice(0, 9) }];
    render(<CamposTela tela="escalacao" live={live() as never} escalacao={opcoes()} />);
    const opcao = within(screen.getByLabelText('TIME CASA')).getByText(/INCOMPLETO/) as HTMLOptionElement;
    expect(opcao.disabled).toBe(true);
    expect(opcao.textContent).toContain('9/11');
  });

  it('formação: todas no select; trocar com posição manual pede confirmação e reseta', () => {
    const pos = Array.from({ length: 11 }, () => ({ x: 0.5, y: 0.5 }));
    const l = live({ escModo: 'campo', escPosCasa: pos });
    render(<CamposTela tela="escalacao" live={l as never} escalacao={opcoes()} />);
    const sel = screen.getByLabelText('FORMAÇÃO CASA');
    expect(within(sel).getAllByRole('option')).toHaveLength(22);
    expect(within(sel).getByText('4-1-2-1-2 (LOSANGO)')).toBeInTheDocument();
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    fireEvent.change(sel, { target: { value: '3-5-2' } });
    expect(l.salvar).not.toHaveBeenCalled();
    fireEvent.change(sel, { target: { value: '3-5-2' } });
    expect(confirmar).toHaveBeenCalledTimes(2);
    expect(l.salvar).toHaveBeenCalledWith({ escFormCasa: '3-5-2', escPosCasa: null });
  });

  it('sem posição manual troca a formação direto', () => {
    const l = live();
    const confirmar = vi.spyOn(window, 'confirm');
    render(<CamposTela tela="escalacao" live={l as never} escalacao={opcoes()} />);
    fireEvent.change(screen.getByLabelText('FORMAÇÃO CASA'), { target: { value: '5-4-1' } });
    expect(confirmar).not.toHaveBeenCalled();
    expect(l.salvar).toHaveBeenCalledWith({ escFormCasa: '5-4-1', escPosCasa: null });
  });

  it('editor de posições e RESETAR FORMAÇÃO só no CAMPO', () => {
    const o = opcoes();
    const { rerender } = render(<CamposTela tela="escalacao" live={live() as never} escalacao={o} />);
    expect(screen.queryByText('EDITAR POSIÇÕES')).toBeNull();
    const l = live({ escModo: 'campo', escTimes: 'ambos', escPosVisit: Array.from({ length: 11 }, () => ({ x: 0.5, y: 0.5 })) });
    rerender(<CamposTela tela="escalacao" live={l as never} escalacao={o} />);
    fireEvent.click(screen.getByText('EDITAR POSIÇÕES'));
    expect(o.aoEditarPosicoes).toHaveBeenCalledWith(true);
    expect((screen.getByText('RESETAR FORMAÇÃO · CASA') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByText('RESETAR FORMAÇÃO · VISITANTE'));
    expect(l.salvar).toHaveBeenCalledWith({ escPosVisit: null });
  });
});

describe('arrastar jogadores', () => {
  it('arrastar grava as 11 posições do time, a partir da formação', () => {
    const estado = { ...ESTADO_PADRAO, escModo: 'campo' as const, escTimeCasaId: 'brasil' };
    const escalados = timesEscalados(estado, TIMES_EXEMPLO);
    const aoMudar = vi.fn();
    render(<ArrastarJogadores escalados={escalados} escala={0.5} aoMudar={aoMudar} />);
    const bola = screen.getByLabelText('Mover 1 Alisson');
    fireEvent.pointerDown(bola, { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(bola, { clientX: 150, clientY: 120, pointerId: 1 });
    expect(aoMudar).toHaveBeenCalledTimes(1);
    const [lado, pontos] = aoMudar.mock.calls[0];
    expect(lado).toBe('casa');
    expect(pontos).toHaveLength(11);
    const antes = centrosNoCampo('4-3-3', null, false, 'casa')[0];
    expect(pontos[0].x * CAMPO.w).toBeCloseTo(antes.x + 100);
    expect(pontos[0].y * CAMPO.h).toBeCloseTo(antes.y + 40);
    // os outros ficam onde estavam
    expect(pontos[5].x * CAMPO.w).toBeCloseTo(centrosNoCampo('4-3-3', null, false, 'casa')[5].x);
  });

  it('não deixa sair do campo', () => {
    const estado = { ...ESTADO_PADRAO, escModo: 'campo' as const, escTimes: 'ambos' as const, escTimeCasaId: 'corinthians', escTimeVisitId: 'palmeiras' };
    const aoMudar = vi.fn();
    render(<ArrastarJogadores escalados={timesEscalados(estado, TIMES_EXEMPLO)} escala={0.5} aoMudar={aoMudar} />);
    const bola = screen.getByLabelText('Mover 21 Weverton');
    fireEvent.pointerDown(bola, { button: 0, clientX: 0, clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(bola, { clientX: 5000, clientY: 5000, pointerId: 1 });
    const [lado, pontos] = aoMudar.mock.calls[0];
    expect(lado).toBe('visitante');
    pontos.forEach((p: { x: number; y: number }) => {
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(1);
      expect(p.y).toBeGreaterThan(0);
      expect(p.y).toBeLessThan(1);
    });
  });
});

describe('tela ESCALAÇÃO', () => {
  it('LISTA com 2 times: colunas, técnico, formação e as câmeras', () => {
    const estado = { ...ESTADO_PADRAO, escTimes: 'ambos' as const, escTimeCasaId: 'corinthians', escTimeVisitId: 'palmeiras', escFormCasa: '4-2-3-1' as const, escFormVisit: '4-3-3' as const, escCams: 6 };
    const { container } = render(<TelaEscalacao estado={estado} previa />);
    expect(container.querySelectorAll('.t-esc-coluna')).toHaveLength(2);
    expect(screen.getByText('Dorival Júnior')).toBeInTheDocument();
    expect(screen.getByText('4-2-3-1')).toBeInTheDocument();
    expect(container.querySelectorAll('.t-esc-jogador')).toHaveLength(22);
    expect(container.querySelectorAll('.t-slot')).toHaveLength(6);
    expect(screen.getByText('CHAT · 440×800')).toBeInTheDocument();
  });

  it('CAMPO só visitante: violeta, 11 bolinhas atacando pra direita', () => {
    const estado = { ...ESTADO_PADRAO, escModo: 'campo' as const, escTimes: 'visitante' as const, escTimeVisitId: 'palmeiras', escCams: 5 };
    const { container } = render(<TelaEscalacao estado={estado} />);
    const bolas = container.querySelectorAll<HTMLElement>('.t-esc-token__bola');
    expect(bolas).toHaveLength(11);
    expect(bolas[0].style.background).toMatch(/139, 108, 240|8B6CF0/i);
    const goleiro = container.querySelectorAll<HTMLElement>('.t-esc-token')[0];
    expect(parseInt(goleiro.style.left)).toBeLessThan(100);
    expect(container.querySelectorAll('.t-slot')).toHaveLength(5);
  });

  it('sem time escolhido usa o nome do placar e não quebra', () => {
    const { container } = render(<TelaEscalacao estado={{ ...ESTADO_PADRAO, timeA: 'CASA X' }} />);
    expect(container.querySelector('.t-esc-coluna__nome')?.textContent).toBe('CASA X');
    expect(container.querySelectorAll('.t-esc-jogador')).toHaveLength(0);
  });

  it('estado antigo sem as chaves esc* cai no padrão', () => {
    const velho = { ...ESTADO_PADRAO, escModo: undefined, escTimes: 'lixo', escFormCasa: 'x', escPosCasa: [1, 2] } as unknown as EstadoLive;
    const { container } = render(<TelaEscalacao estado={velho} />);
    expect(container.querySelectorAll('.t-esc-coluna')).toHaveLength(1);
    expect(container.querySelector('.t-esc-coluna__esquema')?.textContent).toBe('4-3-3');
  });
});

describe('cadastro de TIMES', () => {
  it('lista os times com o contador de titulares e abre o elenco', () => {
    render(<ModalTimes aoFechar={vi.fn()} />);
    fireEvent.click(screen.getByText('BRASIL'));
    expect(screen.getByLabelText('TITULARES').textContent).toBe('11/11 TITULARES');
    expect((screen.getByLabelText('NOME 1') as HTMLInputElement).value).toBe('Alisson');
  });

  it('desmarcar titular mostra 10/11 e não deixa marcar o 12º', () => {
    render(<ModalTimes aoFechar={vi.fn()} />);
    fireEvent.click(screen.getByText('BRASIL'));
    fireEvent.click(screen.getByText('+ JOGADOR'));
    const botoes = screen.getAllByRole('button', { name: /TITULAR|RESERVA/ });
    expect((botoes[11] as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(botoes[3]);
    expect(screen.getByLabelText('TITULARES').textContent).toBe('10/11 TITULARES');
  });

  it('COLAR ELENCO troca o elenco e SALVAR manda o time inteiro', async () => {
    render(<ModalTimes aoFechar={vi.fn()} />);
    fireEvent.click(screen.getByText('+ NOVO TIME'));
    fireEvent.change(screen.getByLabelText('NOME'), { target: { value: 'santos' } });
    fireEvent.change(screen.getByLabelText('TÉCNICO'), { target: { value: 'Fulano' } });
    fireEvent.click(screen.getByText('COLAR ELENCO'));
    const linhas = Array.from({ length: 12 }, (_, i) => `${i + 1} Jogador ${i + 1}`).join('\n');
    fireEvent.change(screen.getByLabelText('ELENCO PRA COLAR'), { target: { value: linhas } });
    fireEvent.click(screen.getByText('USAR ESSA LISTA'));
    expect(screen.getByLabelText('TITULARES').textContent).toBe('11/11 TITULARES');
    fireEvent.click(screen.getByText('SALVAR'));
    await vi.waitFor(() => expect(salvarTime).toHaveBeenCalled());
    const t = salvarTime.mock.calls[0][0] as unknown as Time;
    expect(t.id).toBeNull();
    expect(t.nome).toBe('SANTOS');
    expect(t.tecnico).toBe('Fulano');
    expect(t.jogadores).toHaveLength(12);
    expect(t.jogadores.filter((j) => j.titular)).toHaveLength(11);
  });

  it('reordenar com as setas muda a ordem dos titulares', () => {
    render(<ModalTimes aoFechar={vi.fn()} />);
    fireEvent.click(screen.getByText('BRASIL'));
    fireEvent.click(screen.getByLabelText('Descer Alisson'));
    expect((screen.getByLabelText('NOME 1') as HTMLInputElement).value).toBe('Vanderson');
    expect((screen.getByLabelText('NOME 2') as HTMLInputElement).value).toBe('Alisson');
  });

  it('não salva sem nome', async () => {
    render(<ModalTimes aoFechar={vi.fn()} />);
    fireEvent.click(screen.getByText('+ NOVO TIME'));
    fireEvent.change(screen.getByLabelText('TÉCNICO'), { target: { value: 'x' } });
    fireEvent.click(screen.getByText('SALVAR'));
    expect(screen.getByRole('alert').textContent).toMatch(/nome/);
    expect(salvarTime).not.toHaveBeenCalled();
  });
});
