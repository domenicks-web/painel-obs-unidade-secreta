// Parte 4 (servidor): PIX automático pelo webhook do LivePix, cotações para converter superchat
// em real e a pausa do LivePix enquanto o /alerta toca.
import type { Ambiente } from './livepix.js';

export interface AmbienteApoios extends Ambiente {
  LIVEPIX_CLIENT_ID?: string;
  LIVEPIX_CLIENT_SECRET?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  ALERTA_CHAVE?: string;
}

type Fetch = typeof fetch;

const resposta = (status: number, corpo: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json', ...extra } });

// Chave de servidor do Supabase: a nova (sb_secret_…) vai só no apikey; a antiga (JWT) também no Authorization.
function cabecalhosServidor(amb: AmbienteApoios): Record<string, string> {
  const k = amb.SUPABASE_SERVICE_ROLE_KEY!;
  return { apikey: k, 'content-type': 'application/json', ...(k.startsWith('eyJ') ? { authorization: `Bearer ${k}` } : {}) };
}

async function rpcServidor<T>(amb: AmbienteApoios, f: Fetch, nome: string, args: unknown): Promise<T> {
  const r = await f(`${amb.SUPABASE_URL}/rest/v1/rpc/${nome}`, { method: 'POST', headers: cabecalhosServidor(amb), body: JSON.stringify(args) });
  if (!r.ok) throw new Error(`${nome}: HTTP ${r.status}`);
  return (await r.json()) as T;
}

// ---------------------------------------------------------------------------------------------
// Webhook do LivePix. O aviso não tem assinatura: o servidor busca a mensagem na API do LivePix
// (OAuth client_credentials) e só grava o que a API confirmar. Repetido não duplica (externo_id).

let token: { valor: string; expira: number } | null = null;

export function esquecerToken() {
  token = null;
}

async function tokenLivePix(amb: AmbienteApoios, f: Fetch): Promise<string> {
  if (token && token.expira > Date.now() + 60_000) return token.valor;
  const corpo = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: amb.LIVEPIX_CLIENT_ID!,
    client_secret: amb.LIVEPIX_CLIENT_SECRET!,
    scope: 'messages:read',
  });
  const r = await f('https://oauth.livepix.gg/oauth2/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: corpo,
  });
  if (!r.ok) throw new Error(`token LivePix: HTTP ${r.status}`);
  const j = (await r.json()) as { access_token: string; expires_in?: number };
  token = { valor: j.access_token, expira: Date.now() + (j.expires_in ?? 3600) * 1000 };
  return token.valor;
}

interface AvisoLivePix {
  event?: string;
  resource?: { id?: string; type?: string };
}

interface MensagemLivePix {
  id: string;
  username?: string;
  message?: string;
  amount: number; // centavos
  currency?: string;
}

export async function tratarWebhookLivePix(req: Request, amb: AmbienteApoios, f: Fetch = fetch): Promise<Response> {
  if (req.method !== 'POST') return resposta(405, { erro: 'método não permitido' });
  if (!amb.LIVEPIX_CLIENT_ID || !amb.LIVEPIX_CLIENT_SECRET || !amb.SUPABASE_URL || !amb.SUPABASE_SERVICE_ROLE_KEY)
    return resposta(500, { erro: 'webhook não configurado no servidor' });

  let aviso: AvisoLivePix;
  try {
    aviso = (await req.json()) as AvisoLivePix;
  } catch {
    return resposta(400, { erro: 'corpo inválido' });
  }
  const id = aviso.resource?.id;
  // só mensagens novas (PIX com ou sem texto); assinatura e cancelamento não entram
  if (aviso.event !== 'new' || aviso.resource?.type !== 'message' || !id || !/^[\w-]{1,64}$/.test(id))
    return resposta(200, { ignorado: true });

  try {
    let tk = await tokenLivePix(amb, f);
    let r = await f(`https://api.livepix.gg/v2/messages/${id}`, { headers: { authorization: `Bearer ${tk}` } });
    if (r.status === 401) {
      esquecerToken();
      tk = await tokenLivePix(amb, f);
      r = await f(`https://api.livepix.gg/v2/messages/${id}`, { headers: { authorization: `Bearer ${tk}` } });
    }
    // não existe: aviso falso ou velho, não adianta o LivePix tentar de novo
    if (r.status === 404) return resposta(200, { ignorado: true });
    if (!r.ok) return resposta(502, { erro: `LivePix respondeu HTTP ${r.status}` });
    const { data: m } = (await r.json()) as { data: MensagemLivePix };
    if ((m.currency ?? 'BRL').toUpperCase() !== 'BRL' || !(m.amount > 0)) return resposta(200, { ignorado: true });

    await rpcServidor(amb, f, 'registrar_pix_livepix', {
      p_externo: `livepix:${m.id}`,
      p_nome: m.username ?? '',
      p_valor: m.amount / 100,
      p_msg: m.message ?? '',
    });
    return resposta(200, { ok: true });
  } catch (e) {
    // 5xx: o LivePix tenta de novo a cada 10 min por 24 h
    console.error('webhook LivePix:', e instanceof Error ? e.message : e);
    return resposta(502, { erro: 'não deu pra registrar agora' });
  }
}

// ---------------------------------------------------------------------------------------------
// Cotações: quanto 1 real vale em cada moeda. Fonte aberta, com cache de 6 h na borda da Vercel.
// Se a fonte cair, usa a tabela fixa abaixo (médias de 2026; só pra meta não travar).

export const TAXAS_FIXAS: Record<string, number> = {
  BRL: 1, USD: 0.1955, EUR: 0.17, GBP: 0.146, JPY: 31.4, CAD: 0.274, AUD: 0.278, MXN: 3.39, ARS: 285.7,
  CLP: 180.6, COP: 692, PEN: 0.674, UYU: 7.88, CHF: 0.157, INR: 18.65, KRW: 291, CNY: 1.32, NZD: 0.336,
};

export async function tratarCambio(req: Request, f: Fetch = fetch): Promise<Response> {
  if (req.method !== 'GET') return resposta(405, { erro: 'método não permitido' });
  const cache = { 'cache-control': 'public, s-maxage=21600, stale-while-revalidate=86400' };
  try {
    const r = await f('https://open.er-api.com/v6/latest/BRL');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = (await r.json()) as { result?: string; rates?: Record<string, number>; time_last_update_utc?: string };
    if (j.result !== 'success' || !j.rates?.USD) throw new Error('resposta sem cotações');
    return resposta(200, { base: 'BRL', taxas: j.rates, fonte: 'open.er-api.com', em: j.time_last_update_utc ?? null }, cache);
  } catch (e) {
    console.error('câmbio:', e instanceof Error ? e.message : e);
    return resposta(200, { base: 'BRL', taxas: TAXAS_FIXAS, fonte: 'tabela fixa', em: null }, { 'cache-control': 'public, s-maxage=600' });
  }
}

// ---------------------------------------------------------------------------------------------
// /alerta pausa o LivePix enquanto toca. A fonte do OBS não tem login: autentica pela chave
// (ALERTA_CHAVE) que vai na URL dela. O banco decide se pausa/retoma (alerta_livepix), pra não
// retomar uma pausa que foi da equipe.

function mesmaChave(a: string, b: string) {
  if (a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return dif === 0;
}

export async function tratarAlertaLivePix(req: Request, amb: AmbienteApoios, f: Fetch = fetch): Promise<Response> {
  if (req.method !== 'POST') return resposta(405, { erro: 'método não permitido' });
  if (!amb.ALERTA_CHAVE || !amb.SUPABASE_URL || !amb.SUPABASE_SERVICE_ROLE_KEY || !amb.LIVEPIX_URL_PAUSAR || !amb.LIVEPIX_URL_RETOMAR)
    return resposta(500, { erro: 'alerta não configurado no servidor' });
  if (!mesmaChave(req.headers.get('x-alerta-chave') ?? '', amb.ALERTA_CHAVE)) return resposta(401, { erro: 'chave errada' });

  let acao: unknown;
  try {
    acao = ((await req.json()) as { acao?: unknown }).acao;
  } catch {
    return resposta(400, { erro: 'corpo inválido' });
  }
  if (acao !== 'segurar' && acao !== 'soltar') return resposta(400, { erro: 'ação inválida' });

  try {
    const decisao = await rpcServidor<string>(amb, f, 'alerta_livepix', { p_acao: acao });
    if (decisao === 'pausar' || decisao === 'retomar') {
      const link = decisao === 'pausar' ? amb.LIVEPIX_URL_PAUSAR : amb.LIVEPIX_URL_RETOMAR;
      const r = await f(link, { method: 'POST' });
      if (!r.ok) {
        // não pausou de verdade: desfaz no banco pra ninguém ver "PAUSADO" à toa
        if (decisao === 'pausar') await rpcServidor(amb, f, 'alerta_livepix', { p_acao: 'soltar' }).catch(() => null);
        return resposta(502, { erro: `LivePix respondeu HTTP ${r.status}` });
      }
    }
    return resposta(200, { resultado: decisao });
  } catch (e) {
    console.error('alerta LivePix:', e instanceof Error ? e.message : e);
    return resposta(502, { erro: 'não deu pra falar com o LivePix' });
  }
}
