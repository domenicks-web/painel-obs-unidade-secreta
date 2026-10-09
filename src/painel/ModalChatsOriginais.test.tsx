import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ModalChatsOriginais } from './ModalChatsOriginais';

describe('ModalChatsOriginais', () => {
  it('ABRIR só com canal preenchido; abre o chat em pop-up da plataforma', () => {
    const abrir = vi.spyOn(window, 'open').mockReturnValue(null);
    render(<ModalChatsOriginais canais={{ yt: '', tw: 'unidadesecreta', tt: '', kk: '' }} aoMudar={vi.fn()} aoFechar={vi.fn()} />);
    const botoes = screen.getAllByRole('button', { name: 'ABRIR' }) as HTMLButtonElement[];
    expect(botoes.map((b) => b.disabled)).toEqual([true, false, true, true]);
    fireEvent.click(botoes[1]);
    expect(abrir).toHaveBeenCalledWith('https://www.twitch.tv/popout/unidadesecreta/chat?popout=', 'us-chat-tw', expect.any(String));
    abrir.mockRestore();
  });

  it('digitar grava os canais (estado antigo sem canais também funciona)', () => {
    const aoMudar = vi.fn();
    render(<ModalChatsOriginais canais={undefined} aoMudar={aoMudar} aoFechar={vi.fn()} />);
    fireEvent.change(screen.getAllByRole('textbox')[3], { target: { value: 'unidadesecreta' } });
    expect(aoMudar).toHaveBeenLastCalledWith({ yt: '', tw: '', tt: '', kk: 'unidadesecreta' });
  });
});
