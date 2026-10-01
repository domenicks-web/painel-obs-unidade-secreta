// Social Stream Ninja: a extensão junta YouTube, Twitch e TikTok e manda cada mensagem
// pro servidor de API dela (opção "Send chat messages to API server"); a gente escuta o canal 4.
import type { MsgChat, Plataforma } from './tipos';

export const urlSsn = (sessao: string) => `wss://io.socialstream.ninja/join/${encodeURIComponent(sessao)}/4`;

const PLATAFORMA_DO_TIPO: Record<string, Plataforma> = {
  youtube: 'yt',
  youtubeshorts: 'yt',
  twitch: 'tw',
  tiktok: 'tt',
  kick: 'kk',
};

// Eventos que viram o cartão de novo membro (YT: sponsorship, membershiprenewal, giftpurchase,
// giftredemption; Twitch: subscription, resub, subscription_gift; Kick: new_subscriber, resub,
// subscription_gift). Os outros (follow, entrou, curtiu, redirect…) não aparecem no chat.
// KICKs e gorjetas da Kick chegam com hasDonation ("100 KICKs", "$5.00") e viram apoio.
const EVENTO_MEMBRO = /member|sponsor|subscri|resub|gift(purchase|redemption)/i;
// quem virou membro agora (vale apoio e alerta); renovação/aniversário e compra de presentes não
const MEMBRO_NOVO = /^(sponsorship|giftredemption|subscription|new_member)$/i;

/** Texto puro: emote em <img> vira o alt dele, o resto do HTML some. */
export function textoPuro(valor: unknown, html = true): string {
  if (typeof valor !== 'string') return '';
  if (!html || !valor.includes('<')) return decodificar(valor).trim();
  const doc = new DOMParser().parseFromString(`<body>${valor}</body>`, 'text/html');
  doc.querySelectorAll('img').forEach((img) => img.replaceWith(img.getAttribute('alt') ?? ''));
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function decodificar(s: string) {
  if (!s.includes('&')) return s;
  return new DOMParser().parseFromString(`<body>${s}</body>`, 'text/html').body.textContent ?? s;
}

let semId = 0;

type Bruto = Record<string, unknown>;

export function normalizarSsn(dado: unknown): MsgChat | null {
  if (!dado || typeof dado !== 'object') return null;
  const m = dado as Bruto;
  const plataforma = PLATAFORMA_DO_TIPO[String(m.type ?? '').toLowerCase()];
  if (!plataforma) return null;
  const autor = textoPuro(m.chatname);
  if (!autor) return null;
  const txt = textoPuro(m.chatmessage, m.textonly !== true);
  const evento = typeof m.event === 'string' ? m.event : '';
  const valor = typeof m.hasDonation === 'string' ? m.hasDonation.trim() : '';
  const base = {
    id: m.id != null ? String(m.id) : `ssn-${++semId}`,
    idOriginal: m.id != null ? String(m.id) : undefined,
    plataforma,
    autor,
    txt,
    mod: !!(m.mod || m.moderator),
    membro: !!(m.member || m.membership),
  };
  if (valor) return { ...base, tipo: 'super', valor, sticker: /sticker/i.test(evento) };
  if (evento && EVENTO_MEMBRO.test(evento)) return { ...base, tipo: 'membro', membro: true, membroNovo: MEMBRO_NOVO.test(evento) };
  if (evento || !txt) return null;
  return { ...base, tipo: 'msg' };
}
