// Controles do alerta do LivePix (pausar/retomar, pular, repetir), rodando no servidor.
// O client_secret só existe aqui; o painel chama /api/livepix/* com o token do Supabase
// de quem está logado, e só passa quem é da equipe.
// Docs: https://docs.livepix.gg/api (OAuth2 client_credentials, escopo "controls").

export interface Ambiente {
  LIVEPIX_CLIENT_ID?: string;
  LIVEPIX_CLIENT_SECRET?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}

export type AcaoControle = 'controls' | 'skip' | 'replay';

type Fetch = typeof fetch;

const URL_TOKEN = 'https://oauth.livepix.gg/oauth2/token';
const URL_API = 'https://api.livepix.gg/v2/controls';
const ESCOPO = 'controls';
const FOLGA_MS = 60_000; // renova um minuto antes de expirar

// Cache do token por instância da função (a Vercel reaproveita a instância enquanto está quente).
// A doc do LivePix pede pra usar o token até expirar em vez de pedir um novo a cada chamada.
let cache: { token: string; expiraEm: number } | null = null;

export function limparCacheToken() {
  cache = null;
}

const resposta = (status: number, corpo?: unknown) =>
  corpo === undefined
    ? new Response(null, { status })
    : new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json' } });

async function obterToken(amb: Ambiente, f: Fetch): Promise<string> {
  if (cache && cache.expiraEm - FOLGA_MS > Date.now()) return cache.token;
  const corpo = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: amb.LIVEPIX_CLIENT_ID!,
    client_secret: amb.LIVEPIX_CLIENT_SECRET!,
    scope: ESCOPO,
  });
  const r = await f(URL_TOKEN, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: corpo.toString(),
  });
  if (!r.ok) throw new Error(`token LivePix: HTTP ${r.status}`);
  const dados = (await r.json()) as { access_token?: string; expires_in?: number };
  if (!dados.access_token) throw new Error('token LivePix: resposta sem access_token');
  cache = { token: dados.access_token, expiraEm: Date.now() + (dados.expires_in ?? 3600) * 1000 };
  return cache.token;
}

// Confere o token do Supabase de quem chamou e se essa pessoa está em membros_equipe.
async function membroDaEquipe(req: Request, amb: Ambiente, f: Fetch): Promise<'ok' | 'sem_login' | 'fora'> {
  const auth = req.headers.get('authorization') ?? '';
  if (!/^Bearer \S+$/.test(auth)) return 'sem_login';
  const cabecalhos = { apikey: amb.SUPABASE_ANON_KEY!, authorization: auth };
  const u = await f(`${amb.SUPABASE_URL}/auth/v1/user`, { headers: cabecalhos });
  if (!u.ok) return 'sem_login';
  const { id } = (await u.json()) as { id?: string };
  if (!id) return 'sem_login';
  const m = await f(`${amb.SUPABASE_URL}/rest/v1/membros_equipe?select=papel&user_id=eq.${encodeURIComponent(id)}`, { headers: cabecalhos });
  if (!m.ok) return 'fora';
  const linhas = (await m.json()) as unknown[];
  return Array.isArray(linhas) && linhas.length > 0 ? 'ok' : 'fora';
}

async function chamarLivePix(amb: Ambiente, f: Fetch, caminho: string, metodo: string, corpo?: string) {
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const token = await obterToken(amb, f);
    const r = await f(`${URL_API}${caminho}`, {
      method: metodo,
      headers: { authorization: `Bearer ${token}`, ...(corpo ? { 'content-type': 'application/json' } : {}) },
      body: corpo,
    });
    // token revogado/expirado antes da hora: descarta e tenta uma vez com um novo
    if (r.status === 401 && tentativa === 0) {
      limparCacheToken();
      continue;
    }
    return r;
  }
  throw new Error('inalcançável');
}

export async function tratarControles(req: Request, acao: AcaoControle, amb: Ambiente, f: Fetch = fetch): Promise<Response> {
  const metodosPermitidos = acao === 'controls' ? ['GET', 'PATCH'] : ['POST'];
  if (!metodosPermitidos.includes(req.method)) return resposta(405, { erro: 'método não permitido' });

  if (!amb.LIVEPIX_CLIENT_ID || !amb.LIVEPIX_CLIENT_SECRET) {
    return resposta(500, { erro: 'LivePix não configurado: defina LIVEPIX_CLIENT_ID e LIVEPIX_CLIENT_SECRET no servidor' });
  }
  if (!amb.SUPABASE_URL || !amb.SUPABASE_ANON_KEY) return resposta(500, { erro: 'Supabase não configurado no servidor' });

  try {
    const quem = await membroDaEquipe(req, amb, f);
    if (quem === 'sem_login') return resposta(401, { erro: 'faça login' });
    if (quem === 'fora') return resposta(403, { erro: 'só a equipe controla os alertas' });

    let corpo: string | undefined;
    if (req.method === 'PATCH') {
      const dados = (await req.json().catch(() => null)) as { autoPlay?: unknown } | null;
      if (typeof dados?.autoPlay !== 'boolean') return resposta(400, { erro: 'autoPlay precisa ser true ou false' });
      corpo = JSON.stringify({ autoPlay: dados.autoPlay });
    }

    const caminho = acao === 'controls' ? '' : `/${acao}`;
    const r = await chamarLivePix(amb, f, caminho, req.method, corpo);
    if (!r.ok) return resposta(502, { erro: `LivePix respondeu HTTP ${r.status}` });

    if (req.method === 'GET') {
      const dados = (await r.json()) as { data?: { autoPlay?: boolean } };
      return resposta(200, { autoPlay: dados.data?.autoPlay ?? true });
    }
    return resposta(204);
  } catch (e) {
    // mensagem genérica: nada de token, segredo ou corpo de resposta do LivePix
    console.error('controles LivePix:', e instanceof Error ? e.message : e);
    return resposta(502, { erro: 'não deu pra falar com o LivePix' });
  }
}
