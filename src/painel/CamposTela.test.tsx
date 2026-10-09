import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ESTADO_PADRAO } from '../live/tipos';
import type { Camera } from '../telas/cameras';

vi.mock('../live/relogioServidor', () => ({ useAgora: () => 0 }));
import { CamposTela } from './CamposTela';

function live(extra = {}) {
  return { estado: { ...ESTADO_PADRAO, galera: [{ id: '1', nome: 'ANA', funcao: 'HOST' }], ...extra }, status: 'ao_vivo', editadoPor: null, editadoEm: null, salvar: vi.fn(), salvarDepois: vi.fn(), reiniciarContagem: vi.fn(), relogio: vi.fn(), gol: vi.fn(), repetirGol: vi.fn() } as never;
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
    // porcentagens no modal
    fireEvent.click(screen.getByRole('button', { name: '0% · 0% · 0%' }));
    fireEvent.change(screen.getByLabelText('EMPATE'), { target: { value: '30' } });
    expect((l as { salvarDepois: ReturnType<typeof vi.fn> }).salvarDepois).toHaveBeenCalledWith({ 'enquete.empate': 30 });
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

  describe('molduras de câmera', () => {
    type Fn = ReturnType<typeof vi.fn>;
    const fns = (l: unknown) => l as { salvar: Fn; salvarDepois: Fn };
    const ultimaLista = (f: Fn, chave: string) => f.mock.calls.at(-1)![0][chave] as Camera[];

    it('sem layout salvo, mostra o automático; + ADICIONAR CÂMERA grava a lista com uma 16:9 nova no fim', () => {
      const l = live();
      render(<CamposTela tela="mesa" live={l} />);
      expect(screen.getAllByRole('combobox')).toHaveLength(6);
      fireEvent.click(screen.getByRole('button', { name: '+ ADICIONAR CÂMERA' }));
      const lista = ultimaLista(fns(l).salvar, 'camsMesa');
      expect(lista).toHaveLength(7);
      expect(lista[6]).toMatchObject({ formato: '16:9', w: 640, h: 360, nome: '' });
      expect(lista[0]).toMatchObject({ x: 62, y: 484, nome: 'NOME 01' });
    });

    it('ponto de partida recria o automático com N câmeras (host também troca o 1/2/3)', () => {
      const l = live();
      const { unmount } = render(<CamposTela tela="filme" live={l} />);
      fireEvent.click(screen.getByRole('button', { name: '2 CÂMERAS' }));
      expect(ultimaLista(fns(l).salvar, 'camsFilme')).toHaveLength(2);
      unmount();
      const h = live();
      render(<CamposTela tela="host" live={h} />);
      fireEvent.click(screen.getByRole('button', { name: '3 CÂMERAS' }));
      expect(fns(h).salvar.mock.calls.at(-1)![0]).toMatchObject({ hostCams: '3' });
      expect(ultimaLista(fns(h).salvar, 'camsHost')).toHaveLength(3);
    });

    const uma = (extra = {}) => live({ camsFutebol: [{ id: 'a', nome: 'ANA', formato: '16:9', w: 640, h: 360, x: 100, y: 800, ...extra }] });

    it('largura com formato travado ajusta a altura; X/Y ficam', () => {
      const l = uma();
      render(<CamposTela tela="futebol" live={l} />);
      fireEvent.click(screen.getByRole('button', { name: 'AJUSTAR MOLDURAS' }));
      fireEvent.change(screen.getByLabelText('LARGURA'), { target: { value: '1280' } });
      expect(ultimaLista(fns(l).salvarDepois, 'camsFutebol')[0]).toMatchObject({ w: 1280, h: 720, x: 100, y: 800 });
    });

    it('livre: altura sozinha; X e Y', () => {
      const l = uma({ formato: 'livre' });
      render(<CamposTela tela="futebol" live={l} />);
      fireEvent.click(screen.getByRole('button', { name: 'AJUSTAR MOLDURAS' }));
      fireEvent.change(screen.getByLabelText('ALTURA'), { target: { value: '500' } });
      expect(ultimaLista(fns(l).salvarDepois, 'camsFutebol')[0]).toMatchObject({ w: 640, h: 500 });
      fireEvent.change(screen.getByLabelText('X'), { target: { value: '300' } });
      expect(ultimaLista(fns(l).salvarDepois, 'camsFutebol')[0]).toMatchObject({ x: 300, y: 800 });
      fireEvent.change(screen.getByLabelText('Y'), { target: { value: '900' } });
      expect(ultimaLista(fns(l).salvarDepois, 'camsFutebol')[0]).toMatchObject({ y: 900 });
      const chamadas = fns(l).salvarDepois.mock.calls.length;
      fireEvent.change(screen.getByLabelText('X'), { target: { value: '' } }); // apagando pra digitar: não grava lixo
      expect(fns(l).salvarDepois.mock.calls.length).toBe(chamadas);
    });

    it('formato, nome, ordem e remover', () => {
      const l = live({
        camsFutebol: [
          { id: 'a', nome: 'ANA', formato: '16:9', w: 640, h: 360, x: 100, y: 800 },
          { id: 'b', nome: 'BIA', formato: '16:9', w: 640, h: 360, x: 800, y: 800 },
        ],
      });
      const { salvar, salvarDepois } = fns(l);
      render(<CamposTela tela="futebol" live={l} />);
      fireEvent.click(screen.getByRole('button', { name: 'AJUSTAR MOLDURAS' }));
      fireEvent.click(screen.getAllByRole('button', { name: '1:1' })[0]);
      expect(ultimaLista(salvar, 'camsFutebol')[0]).toMatchObject({ formato: '1:1', w: 640, h: 640 });
      fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'caio' } });
      expect(ultimaLista(salvarDepois, 'camsFutebol')[1].nome).toBe('CAIO');
      fireEvent.click(screen.getAllByRole('button', { name: 'PRA FRENTE' })[0]);
      expect(ultimaLista(salvar, 'camsFutebol').map((c) => c.id)).toEqual(['b', 'a']);
      expect((screen.getAllByRole('button', { name: 'PRA FRENTE' })[1] as HTMLButtonElement).disabled).toBe(true);
      fireEvent.click(screen.getAllByRole('button', { name: 'REMOVER' })[0]);
      expect(ultimaLista(salvar, 'camsFutebol').map((c) => c.id)).toEqual(['b']);
    });

    it('etiqueta: esquerda, direita ou sem', () => {
      const l = uma();
      render(<CamposTela tela="futebol" live={l} />);
      fireEvent.click(screen.getByRole('button', { name: 'AJUSTAR MOLDURAS' }));
      expect(screen.getByRole('button', { name: 'ESQUERDA' }).className).toContain('p-opcao--ativa');
      fireEvent.click(screen.getByRole('button', { name: 'DIREITA' }));
      expect(ultimaLista(fns(l).salvar, 'camsFutebol')[0]).toMatchObject({ etiqueta: 'direita' });
      fireEvent.click(screen.getByRole('button', { name: 'SEM' }));
      expect(ultimaLista(fns(l).salvar, 'camsFutebol')[0]).toMatchObject({ etiqueta: 'nenhuma' });
    });

    it('no máximo 12 câmeras', () => {
      const cams = Array.from({ length: 12 }, (_, i) => ({ id: String(i), nome: '', formato: '16:9' as const, w: 160, h: 90, x: 0, y: 500 }));
      render(<CamposTela tela="mesa" live={live({ camsMesa: cams })} />);
      expect((screen.getByRole('button', { name: '+ ADICIONAR CÂMERA' }) as HTMLButtonElement).disabled).toBe(true);
    });
  });

  it('futebol: animação de gol por time, repetir, som e duração', () => {
    const l = live({ golEvento: { id: 'g', lado: 'A', a: 1, b: 0, em: 0, dur: 4, anim: true } });
    const f = l as { salvar: ReturnType<typeof vi.fn>; salvarDepois: ReturnType<typeof vi.fn>; repetirGol: ReturnType<typeof vi.fn> };
    render(<CamposTela tela="futebol" live={l} />);
    const [casa, fora] = screen.getAllByRole('button', { name: /ANIMAÇÃO DE GOL/ });
    expect(casa.textContent).toContain('LIGADA');
    expect(fora.textContent).toContain('DESLIGADA');
    fireEvent.click(fora);
    expect(f.salvar).toHaveBeenCalledWith({ golAnimB: true });
    fireEvent.click(casa);
    expect(f.salvar).toHaveBeenCalledWith({ golAnimA: false });
    fireEvent.click(screen.getByRole('button', { name: 'REPETIR ANIMAÇÃO' }));
    expect(f.repetirGol).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'AJUSTES' }));
    fireEvent.click(screen.getByRole('button', { name: /SOM DO GOL/ }));
    expect(f.salvar).toHaveBeenCalledWith({ golSom: true });
    const dur = screen.getByLabelText('DURAÇÃO (S)');
    fireEvent.change(dur, { target: { value: '5' } });
    expect(f.salvarDepois).toHaveBeenLastCalledWith({ golDuracao: 5 });
    fireEvent.change(dur, { target: { value: '9' } });
    expect(f.salvarDepois).toHaveBeenLastCalledWith({ golDuracao: 6 });
    const n = f.salvarDepois.mock.calls.length;
    fireEvent.change(dur, { target: { value: '' } });
    expect(f.salvarDepois.mock.calls.length).toBe(n);
  });

  it('futebol: sem gol ainda, REPETIR fica travado', () => {
    render(<CamposTela tela="futebol" live={live()} />);
    expect((screen.getByRole('button', { name: 'REPETIR ANIMAÇÃO' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('lower: escolher alguém da galera preenche nome e função', () => {
    const l = live();
    render(<CamposTela tela="lower" live={l} />);
    fireEvent.click(screen.getByRole('button', { name: 'ANA' }));
    expect((l as { salvar: ReturnType<typeof vi.fn> }).salvar).toHaveBeenCalledWith({ ltNome: 'ANA', funcao: 'HOST' });
  });

  it('nome no layout automático grava a lista da tela com o nome novo', () => {
    const l = live({ hostCams: '2' });
    render(<CamposTela tela="host" live={l} />);
    const cam2 = screen.getByLabelText('CÂMERA 02');
    fireEvent.focus(cam2);
    fireEvent.change(cam2, { target: { value: 'zé' } });
    const patch = (l as { salvarDepois: ReturnType<typeof vi.fn> }).salvarDepois.mock.calls.at(-1)![0];
    expect(patch.camsHost.map((c: Camera) => c.nome)).toEqual(['NOME 01', 'ZÉ']);
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
