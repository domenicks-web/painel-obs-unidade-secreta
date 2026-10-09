import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CaixaChat } from './CaixaChat';
import type { MsgChat } from '../chat/tipos';

const msg = (id: number, extra: Partial<MsgChat> = {}): MsgChat => ({
  id: String(id), plataforma: 'yt', autor: `autor${id}`, txt: `texto ${id}`, tipo: 'msg', mod: false, membro: false, ...extra,
});

function montar(extra: Partial<Parameters<typeof CaixaChat>[0]> = {}) {
  const props = {
    msgs: [msg(1), msg(2, { plataforma: 'tw' }), msg(3, { plataforma: 'tt' })],
    status: 'ao_vivo' as const,
    sessao: 'abc',
    aoTrocarSessao: vi.fn(),
    pin: null,
    aoDestacar: vi.fn(),
    aoAbrirOriginais: vi.fn(),
    ...extra,
  };
  render(<CaixaChat {...props} />);
  return props;
}

describe('CaixaChat', () => {
  it('lista a mais nova em cima; filtro some com a plataforma', () => {
    montar();
    const textos = () => [...document.querySelectorAll('.p-chat__txt')].map((e) => e.textContent);
    expect(textos()[0]).toContain('texto 3');
    fireEvent.click(screen.getByRole('button', { name: 'TW' }));
    expect(textos().join()).not.toContain('texto 2');
    expect(screen.getByRole('button', { name: 'TW' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('DESTACAR manda autor, texto e plataforma; TIRAR manda null', () => {
    const p = montar({ pin: { autor: 'Bia', txt: 'salve', plataforma: 'yt' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'DESTACAR' })[0]);
    expect(p.aoDestacar).toHaveBeenCalledWith({ autor: 'autor3', txt: 'texto 3', plataforma: 'tt' });
    expect(screen.getByText('NA TELA · Bia')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'TIRAR' }));
    expect(p.aoDestacar).toHaveBeenLastCalledWith(null);
  });

  it('sem sessão pede o ID; TROCAR abre o campo de novo', () => {
    const p = montar({ sessao: '', status: 'sem_sessao', msgs: [] });
    fireEvent.change(screen.getByLabelText('ID DA SESSÃO DO SOCIAL STREAM NINJA'), { target: { value: '  xyz ' } });
    fireEvent.click(screen.getByRole('button', { name: 'CONECTAR' }));
    expect(p.aoTrocarSessao).toHaveBeenCalledWith('xyz');
  });

  it('com sessão: TROCAR mostra o campo com o ID atual', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'TROCAR' }));
    expect(screen.getByLabelText('ID DA SESSÃO DO SOCIAL STREAM NINJA')).toHaveValue('abc');
  });

  it('reserva: abre o chat em janela e os chats originais', () => {
    const abrir = vi.spyOn(window, 'open').mockReturnValue(null);
    const p = montar();
    fireEvent.click(screen.getByRole('button', { name: 'ABRIR EM JANELA' }));
    expect(abrir).toHaveBeenCalledWith('/painel/chat', 'us-chat-painel', expect.stringContaining('popup'));
    fireEvent.click(screen.getByRole('button', { name: 'CHATS ORIGINAIS' }));
    expect(p.aoAbrirOriginais).toHaveBeenCalled();
    abrir.mockRestore();
  });

  it('na janela separada não tem o botão de abrir janela', () => {
    montar({ janela: true });
    expect(screen.queryByRole('button', { name: 'ABRIR EM JANELA' })).toBeNull();
    expect(screen.getByRole('button', { name: 'CHATS ORIGINAIS' })).toBeTruthy();
  });
});
