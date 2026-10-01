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
    fireEvent.change(campo, { target: { value: '37:12' } });
    fireEvent.submit(campo);
    expect(relogio).toHaveBeenLastCalledWith('definir', 2232);
    expect((campo as HTMLInputElement).value).toBe('');

    relogio.mockClear();
    fireEvent.change(campo, { target: { value: '1:75' } });
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
