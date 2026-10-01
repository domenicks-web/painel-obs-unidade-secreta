import { describe, expect, it } from 'vitest';
import { normalizarSsn, textoPuro, urlSsn } from './ssn';

describe('urlSsn', () => {
  it('canal 4 do servidor de API', () => {
    expect(urlSsn('abc 1')).toBe('wss://io.socialstream.ninja/join/abc%201/4');
  });
});

describe('textoPuro', () => {
  it('emote vira o alt, HTML some, entidades viram texto', () => {
    expect(textoPuro('boa <img src="x.png" alt=":fire:"> <b>noite</b>')).toBe('boa :fire: noite');
    expect(textoPuro('a &amp; b')).toBe('a & b');
  });
  it('textonly: não interpreta tags', () => {
    expect(textoPuro('<b>oi</b>', false)).toBe('<b>oi</b>');
  });
});

describe('normalizarSsn', () => {
  it('mensagem comum do YouTube, com mod e membro', () => {
    expect(
      normalizarSsn({ id: 7, type: 'youtube', chatname: 'Lipe10', chatmessage: 'GOLAÇO', mod: true, member: true }),
    ).toEqual({ id: '7', idOriginal: '7', plataforma: 'yt', autor: 'Lipe10', txt: 'GOLAÇO', tipo: 'msg', mod: true, membro: true });
  });

  it('Twitch e TikTok viram TW e TT; outras plataformas são ignoradas', () => {
    expect(normalizarSsn({ type: 'twitch', chatname: 'a', chatmessage: 'oi' })?.plataforma).toBe('tw');
    expect(normalizarSsn({ type: 'tiktok', chatname: 'a', chatmessage: 'oi' })?.plataforma).toBe('tt');
    expect(normalizarSsn({ type: 'youtubeshorts', chatname: 'a', chatmessage: 'oi' })?.plataforma).toBe('yt');
    expect(normalizarSsn({ type: 'facebook', chatname: 'a', chatmessage: 'oi' })).toBeNull();
  });

  it('doação vira superchat com o valor como veio', () => {
    const m = normalizarSsn({ type: 'youtube', chatname: 'zeca', chatmessage: 'toma', hasDonation: 'R$ 10,00', event: 'superchat' });
    expect(m).toMatchObject({ tipo: 'super', valor: 'R$ 10,00', txt: 'toma' });
  });

  it('super sticker e membro novo ficam marcados; aniversário de membro não é novo', () => {
    expect(normalizarSsn({ type: 'youtube', chatname: 'a', chatmessage: '', hasDonation: 'R$ 5,00', event: 'supersticker' })).toMatchObject({ tipo: 'super', sticker: true });
    expect(normalizarSsn({ type: 'youtube', chatname: 'a', chatmessage: 'x', hasDonation: 'R$ 5,00', event: 'superchat' })?.sticker).toBe(false);
    expect(normalizarSsn({ type: 'youtube', chatname: 'a', chatmessage: 'oi', membership: 'M', event: 'sponsorship' })?.membroNovo).toBe(true);
    expect(normalizarSsn({ type: 'youtube', chatname: 'a', chatmessage: 'oi', membership: 'M', event: 'giftredemption' })?.membroNovo).toBe(true);
    expect(normalizarSsn({ type: 'youtube', chatname: 'a', chatmessage: '12 meses', membership: 'M', event: 'membershiprenewal' })?.membroNovo).toBe(false);
  });

  it('evento de membro vira o cartão de novo membro', () => {
    const m = normalizarSsn({ type: 'youtube', chatname: 'Bia', chatmessage: 'Welcome!', membership: 'MEMBERSHIP', event: 'sponsorship' });
    expect(m).toMatchObject({ tipo: 'membro', autor: 'Bia', membro: true });
    expect(normalizarSsn({ type: 'twitch', chatname: 'x', chatmessage: '', event: 'subscription_gift' })?.tipo).toBe('membro');
  });

  it('outros eventos, mensagem vazia e lixo são ignorados', () => {
    expect(normalizarSsn({ type: 'tiktok', chatname: 'a', chatmessage: 'seguiu', event: 'followed' })).toBeNull();
    expect(normalizarSsn({ type: 'youtube', chatname: 'a', chatmessage: 'x', membership: 'REDIRECT', event: 'redirect' })).toBeNull();
    expect(normalizarSsn({ type: 'youtube', chatname: 'a', chatmessage: '' })).toBeNull();
    expect(normalizarSsn({ delete: { id: 1 } })).toBeNull();
    expect(normalizarSsn('texto')).toBeNull();
  });

  it('sem id: gera um diferente pra cada mensagem', () => {
    const a = normalizarSsn({ type: 'youtube', chatname: 'a', chatmessage: 'x' });
    const b = normalizarSsn({ type: 'youtube', chatname: 'a', chatmessage: 'x' });
    expect(a?.id).not.toBe(b?.id);
  });
});

describe('Kick', () => {
  it('mensagem vira plataforma kk', () => {
    expect(normalizarSsn({ type: 'kick', id: 'k1', chatname: 'zeca', chatmessage: 'salve' })).toMatchObject({ plataforma: 'kk', tipo: 'msg', txt: 'salve' });
  });
  it('KICKs e gorjeta viram apoio (super), com o valor como veio', () => {
    expect(normalizarSsn({ type: 'kick', id: 'k2', chatname: 'zeca', chatmessage: '', event: 'gift', hasDonation: '100 KICKs' })).toMatchObject({
      plataforma: 'kk',
      tipo: 'super',
      valor: '100 KICKs',
    });
    expect(normalizarSsn({ type: 'kick', id: 'k3', chatname: 'zeca', chatmessage: 'tamo junto', event: 'donation', hasDonation: '$5.00' })).toMatchObject({
      tipo: 'super',
      valor: '$5.00',
    });
  });
  it('sub novo, renovação e de presente viram membro; follow não aparece', () => {
    for (const event of ['new_subscriber', 'resub', 'subscription_gift'])
      expect(normalizarSsn({ type: 'kick', id: event, chatname: 'zeca', chatmessage: '', event })).toMatchObject({ plataforma: 'kk', tipo: 'membro' });
    expect(normalizarSsn({ type: 'kick', id: 'f', chatname: 'zeca', chatmessage: '', event: 'new_follower' })).toBeNull();
  });
});
