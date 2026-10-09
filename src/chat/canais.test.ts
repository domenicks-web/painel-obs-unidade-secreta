import { describe, expect, it } from 'vitest';
import { idVideoYoutube, nomeDoCanal, urlChatOriginal } from './canais';

describe('nomeDoCanal', () => {
  it('aceita @, nome puro e link', () => {
    expect(nomeDoCanal('@unidadesecreta')).toBe('unidadesecreta');
    expect(nomeDoCanal(' unidadesecreta ')).toBe('unidadesecreta');
    expect(nomeDoCanal('https://www.twitch.tv/unidadesecreta')).toBe('unidadesecreta');
    expect(nomeDoCanal('kick.com/unidadesecreta?x=1')).toBe('unidadesecreta');
    expect(nomeDoCanal('https://www.tiktok.com/@unidadesecreta/live')).toBe('unidadesecreta');
  });
});

describe('idVideoYoutube', () => {
  it('acha o ID nos links da live ou puro', () => {
    expect(idVideoYoutube('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=2')).toBe('dQw4w9WgXcQ');
    expect(idVideoYoutube('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(idVideoYoutube('https://www.youtube.com/live/dQw4w9WgXcQ?si=abc')).toBe('dQw4w9WgXcQ');
    expect(idVideoYoutube('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(idVideoYoutube('@unidadesecreta')).toBeNull();
  });
});

describe('urlChatOriginal', () => {
  it('monta o link de cada plataforma', () => {
    expect(urlChatOriginal('yt', 'https://youtu.be/dQw4w9WgXcQ')).toBe('https://www.youtube.com/live_chat?is_popout=1&v=dQw4w9WgXcQ');
    expect(urlChatOriginal('yt', '@unidadesecreta')).toBe('https://www.youtube.com/@unidadesecreta/live');
    expect(urlChatOriginal('tw', 'unidadesecreta')).toBe('https://www.twitch.tv/popout/unidadesecreta/chat?popout=');
    expect(urlChatOriginal('kk', '@unidadesecreta')).toBe('https://kick.com/popout/unidadesecreta/chat');
    expect(urlChatOriginal('tt', 'unidadesecreta')).toBe('https://www.tiktok.com/@unidadesecreta/live');
  });
  it('vazio não tem link', () => {
    expect(urlChatOriginal('tw', '  ')).toBeNull();
  });
});
