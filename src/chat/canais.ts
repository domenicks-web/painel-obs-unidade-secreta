// Reserva do chat: abre os chats originais de cada plataforma em janelas, sem depender do
// Social Stream Ninja. Os canais ficam no estado da live (são públicos) e valem em qualquer PC.
import type { Plataforma } from './tipos';

export type Canais = Record<Plataforma, string>;
export const CANAIS_VAZIOS: Canais = { yt: '', tw: '', tt: '', kk: '' };

export const NOME_PLATAFORMA: Record<Plataforma, string> = { yt: 'YOUTUBE', tw: 'TWITCH', tt: 'TIKTOK', kk: 'KICK' };

/** Nome do canal a partir do que foi colado: "@fulano", "fulano" ou o link do canal. */
export function nomeDoCanal(valor: string): string {
  return valor
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^(www\.|m\.)?[a-z0-9.-]+\.[a-z]{2,}\//i, '')
    .replace(/^@/, '')
    .split(/[/?#\s]/)[0];
}

/** ID do vídeo da live do YouTube num link (watch?v=, youtu.be/, /live/) ou o ID puro. */
export function idVideoYoutube(valor: string): string | null {
  const v = valor.trim();
  const m = /(?:[?&]v=|youtu\.be\/|\/live\/)([\w-]{11})(?![\w-])/.exec(v);
  if (m) return m[1];
  return /^[\w-]{11}$/.test(v) ? v : null;
}

/**
 * Link do chat original. YouTube: com o link (ou ID) da live abre só o chat em pop-up; com o @ do
 * canal abre a página da live (o chat fica do lado). TikTok não tem chat em pop-up: abre a live.
 */
export function urlChatOriginal(p: Plataforma, valor: string): string | null {
  if (!valor.trim()) return null;
  if (p === 'yt') {
    const id = idVideoYoutube(valor);
    if (id) return `https://www.youtube.com/live_chat?is_popout=1&v=${id}`;
  }
  const canal = nomeDoCanal(valor);
  if (!canal) return null;
  const c = encodeURIComponent(canal);
  switch (p) {
    case 'yt':
      return `https://www.youtube.com/@${c}/live`;
    case 'tw':
      return `https://www.twitch.tv/popout/${c}/chat?popout=`;
    case 'kk':
      return `https://kick.com/popout/${c}/chat`;
    case 'tt':
      return `https://www.tiktok.com/@${c}/live`;
  }
}

export function abrirJanela(url: string, nome: string, w = 420, h = 760) {
  window.open(url, nome, `popup,width=${w},height=${h}`);
}
