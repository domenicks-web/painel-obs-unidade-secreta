import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ESTADO_PADRAO } from '../live/tipos';

vi.mock('../live/relogioServidor', () => ({ useAgora: () => 0 }));
import { CamposTela } from './CamposTela';

function live(extra = {}) {
  return { estado: { ...ESTADO_PADRAO, galera: [{ id: '1', nome: 'ANA', funcao: 'HOST' }], ...extra }, status: 'ao_vivo', editadoPor: null, editadoEm: null, salvar: vi.fn(), salvarDepois: vi.fn(), reiniciarContagem: vi.fn(), relogio: vi.fn(), gol: vi.fn() } as never;
}

describe('CamposTela', () => {
  it('futebol: gol, relógio, OUTRO e enquete', () => {
    const l = live({ golsA: 1 });
    render(<CamposTela tela="futebol" live={l} />);
    fireEvent.click(screen.getAllByText('+')[0]);
    expect((l as { gol: ReturnType<typeof vi.fn> }).gol).toHaveBeenCalledWith('A', 1);
    fireEvent.click(screen.getAllByText('−')[1]);
    expect((l as { gol: ReturnType<typeof vi.fn> }).gol).toHaveBeenCalledWith('B', -1);
    fireEvent.click(screen.getByText('▶ INICIAR'));
    expect((l as { relogio: ReturnType<typeof vi.fn> }).relogio).toHaveBeenCalledWith('iniciar');
    fireEvent.click(screen.getByText('OUTRO'));
    expect((l as { salvar: ReturnType<typeof vi.fn> }).salvar).toHaveBeenCalledWith({ jogo: 'OUTRO' });
    fireEvent.click(screen.getByText('MOSTRAR'));
    expect((l as { salvar: ReturnType<typeof vi.fn> }).salvar).toHaveBeenCalledWith({ 'enquete.mostrar': true });
  });

  it('futebol: ajuste rápido e tempo exato do relógio', () => {
    const l = live();
    const relogio = (l as { relogio: ReturnType<typeof vi.fn> }).relogio;
    render(<CamposTela tela="futebol" live={l} />);
    fireEvent.click(screen.getByRole('button', { name: '−1 MIN' }));
    fireEvent.click(screen.getByRole('button', { name: '−10 S' }));
    fireEvent.click(screen.getByRole('button', { name: '+10 S' }));
    fireEvent.click(screen.getByRole('button', { name: '+1 MIN' }));
    expect(relogio.mock.calls).toEqual([['ajustar', -60], ['ajustar', -10], ['ajustar', 10], ['ajustar', 60]]);

    const campo = screen.getByLabelText('TEMPO EXATO');
    fireEvent.change(campo, { target: { value: '3712' } });
    expect((campo as HTMLInputElement).value).toBe('37:12');
    fireEvent.submit(campo);
    expect(relogio).toHaveBeenLastCalledWith('definir', 2232);
    expect((campo as HTMLInputElement).value).toBe('');

    relogio.mockClear();
    fireEvent.change(campo, { target: { value: '175' } });
    fireEvent.click(screen.getByRole('button', { name: 'DEFINIR' }));
    expect(relogio).not.toHaveBeenCalled();
    expect(campo.getAttribute('aria-invalid')).toBe('true');
  });

  it('futebol: pausado com tempo corrido mostra RETOMAR', () => {
    const l = live({ clockAcumulado: 600, clockRodando: false });
    render(<CamposTela tela="futebol" live={l} />);
    fireEvent.click(screen.getByText('▶ RETOMAR'));
    expect((l as { relogio: ReturnType<typeof vi.fn> }).relogio).toHaveBeenCalledWith('iniciar');
  });

  it('mesa, filme e futebol escolhem quantas câmeras; os campos de nome seguem a quantidade', () => {
    const l = live({ mesaCams: 3 });
    const salvar = (l as { salvar: ReturnType<typeof vi.fn> }).salvar;
    const { unmount } = render(<CamposTela tela="mesa" live={l} />);
    expect(screen.getAllByRole('button', { name: /^[1-6]$/ })).toHaveLength(6);
    expect(screen.getByLabelText('CÂMERA 03')).toBeTruthy();
    expect(screen.queryByLabelText('CÂMERA 04')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    expect(salvar).toHaveBeenCalledWith({ mesaCams: 5 });
    unmount();

    const f = live();
    const r = render(<CamposTela tela="filme" live={f} />);
    expect(screen.getAllByRole('button', { name: /^[1-6]$/ })).toHaveLength(4);
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    expect((f as { salvar: ReturnType<typeof vi.fn> }).salvar).toHaveBeenCalledWith({ filmeCams: 1 });
    r.unmount();

    const fu = live();
    render(<CamposTela tela="futebol" live={fu} />);
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    expect((fu as { salvar: ReturnType<typeof vi.fn> }).salvar).toHaveBeenCalledWith({ futebolCams: 1 });
  });

  it('câmeras manuais: liga/desliga e esconde os nomes', () => {
    const l = live();
    const { unmount } = render(<CamposTela tela="host" live={l} />);
    fireEvent.click(screen.getByRole('button', { name: 'CÂMERAS MANUAIS' }));
    expect((l as { salvar: ReturnType<typeof vi.fn> }).salvar).toHaveBeenCalledWith({ camsManuais: true });
    unmount();

    const m = live({ camsManuais: true });
    render(<CamposTela tela="mesa" live={m} />);
    expect(screen.queryByLabelText('CÂMERA 01')).toBeNull();
    expect(screen.queryByRole('button', { name: '5' })).toBeNull();
    expect(screen.getByText(/direto no OBS/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'CÂMERAS MANUAIS' }));
    expect((m as { salvar: ReturnType<typeof vi.fn> }).salvar).toHaveBeenCalledWith({ camsManuais: false });
  });

  it('lower: escolher alguém da galera preenche nome e função', () => {
    const l = live();
    render(<CamposTela tela="lower" live={l} />);
    fireEvent.click(screen.getByRole('button', { name: 'ANA' }));
    expect((l as { salvar: ReturnType<typeof vi.fn> }).salvar).toHaveBeenCalledWith({ ltNome: 'ANA', funcao: 'HOST' });
  });

  it('câmera grava só o próprio índice', () => {
    const l = live({ hostCams: '2' });
    render(<CamposTela tela="host" live={l} />);
    const cam2 = screen.getByLabelText('CÂMERA 02');
    fireEvent.focus(cam2);
    fireEvent.change(cam2, { target: { value: 'zé' } });
    expect((l as { salvarDepois: ReturnType<typeof vi.fn> }).salvarDepois).toHaveBeenLastCalledWith({ 'nomes.1': 'ZÉ' });
  });

  it('início: minutos e reiniciar', () => {
    const l = live();
    render(<CamposTela tela="inicio" live={l} />);
    fireEvent.click(screen.getByText('10 MIN'));
    expect((l as { salvar: ReturnType<typeof vi.fn> }).salvar).toHaveBeenCalledWith({ minutos: 10 });
    fireEvent.click(screen.getByText('↻ REINICIAR'));
    expect((l as { reiniciarContagem: ReturnType<typeof vi.fn> }).reiniciarContagem).toHaveBeenCalled();
  });
});
