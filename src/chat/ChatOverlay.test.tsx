import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChatOverlay, MAX_OVERLAY } from './ChatOverlay';
import type { MsgChat } from './tipos';

const msg = (id: number, extra: Partial<MsgChat> = {}): MsgChat => ({
  id: String(id), plataforma: 'yt', autor: `autor${id}`, txt: `texto ${id}`, tipo: 'msg', mod: false, membro: false, ...extra,
});

describe('ChatOverlay', () => {
  it('mostra só as últimas, com chip da plataforma e MOD', () => {
    const msgs = Array.from({ length: MAX_OVERLAY + 2 }, (_, i) => msg(i, i === MAX_OVERLAY + 1 ? { plataforma: 'tw', mod: true } : {}));
    render(<ChatOverlay msgs={msgs} pin={null} />);
    expect(screen.queryByText('texto 0')).toBeNull();
    expect(screen.queryByText('texto 1')).toBeNull();
    expect(screen.getByText('texto 2')).toBeInTheDocument();
    const ultima = screen.getByText(`autor${MAX_OVERLAY + 1}`);
    expect(ultima).toHaveTextContent('TW');
    expect(ultima).toHaveTextContent('MOD');
  });

  it('superchat mostra o valor; membro mostra o cartão', () => {
    render(<ChatOverlay msgs={[msg(1, { tipo: 'super', valor: 'R$ 20,00' }), msg(2, { tipo: 'membro' })]} pin={null} />);
    expect(screen.getByText('R$ 20,00')).toBeInTheDocument();
    expect(screen.getByText('NOVO MEMBRO DA UNIDADE')).toBeInTheDocument();
  });

  it('destaque fica no topo com autor, texto e plataforma', () => {
    const { container } = render(<ChatOverlay msgs={[msg(1)]} pin={{ autor: 'Bia', txt: 'salve', plataforma: 'tt' }} />);
    const pin = container.querySelector('.c-pin')!;
    expect(pin).toHaveTextContent('EM DESTAQUE');
    expect(pin).toHaveTextContent('TT');
    expect(pin).toHaveTextContent('Bia');
    expect(pin).toHaveTextContent('salve');
    expect(container.querySelector('.c-chat')!.firstElementChild).toBe(pin);
  });
});
