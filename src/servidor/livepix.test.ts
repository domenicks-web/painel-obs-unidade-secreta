// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { limparCacheToken, tratarControles, type Ambiente } from './livepix';

const AMB: Ambiente = {
  LIVEPIX_CLIENT_ID: 'cid',
  LIVEPIX_CLIENT_SECRET: 'segredo-super',
  SUPABASE_URL: 'https://sb.test',
  SUPABASE_ANON_KEY: 'anon',
};

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } });

// fetch falso: responde Supabase (usuário + membro) e LivePix (token + controles)
function montarFetch(opcoes: { membro?: boolean; usuarioOk?: boolean; controles?: (url: string, init: RequestInit) => Response; expiraEm?: number } = {}) {
  const { membro = true, usuarioOk = true, expiraEm = 3600 } = opcoes;
  let tokens = 0;
  const f = vi.fn(async (entrada: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(entrada);
    if (url === 'https://sb.test/auth/v1/user') return usuarioOk ? json({ id: 'u1' }) : json({ msg: 'invalid' }, 401);
    if (url.startsWith('https://sb.test/rest/v1/membros_equipe')) return json(membro ? [{ papel: 'editor' }] : []);
    if (url === 'https://oauth.livepix.gg/oauth2/token') {
      tokens++;
      return json({ access_token: `tok${tokens}`, expires_in: expiraEm, token_type: 'bearer', scope: 'controls' });
    }
    if (url.startsWith('https://api.livepix.gg/v2/controls')) {
      if (opcoes.controles) return opcoes.controles(url, init);
      return init.method === 'GET' || !init.method ? json({ data: { autoPlay: true } }) : new Response(null, { status: 204 });
    }
    throw new Error('url inesperada ' + url);
  });
  return f;
}

const req = (metodo: string, corpo?: unknown, auth = 'Bearer jwt-do-usuario') =>
  new Request('https://site.test/api/livepix/x', {
    method: metodo,
    headers: { authorization: auth, 'content-type': 'application/json' },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });

const chamadasLivePix = (f: ReturnType<typeof montarFetch>) =>
  f.mock.calls.filter(([u]) => String(u).startsWith('https://api.livepix.gg')).map(([u, i]) => [String(u), (i as RequestInit).method, (i as RequestInit).body]);

beforeEach(() => limparCacheToken());

describe('rotas de controle do LivePix', () => {
  it('GET devolve o autoPlay e pede o token com client_credentials e escopo controls', async () => {
    const f = montarFetch();
    const r = await tratarControles(req('GET'), 'controls', AMB, f);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ autoPlay: true });
    const [, init] = f.mock.calls.find(([u]) => String(u) === 'https://oauth.livepix.gg/oauth2/token')!;
    const corpo = new URLSearchParams(String((init as RequestInit).body));
    expect(corpo.get('grant_type')).toBe('client_credentials');
    expect(corpo.get('client_id')).toBe('cid');
    expect(corpo.get('client_secret')).toBe('segredo-super');
    expect(corpo.get('scope')).toBe('controls');
  });

  it('PATCH manda só {autoPlay}; skip e replay viram POST', async () => {
    const f = montarFetch();
    expect((await tratarControles(req('PATCH', { autoPlay: false, lixo: 1 }), 'controls', AMB, f)).status).toBe(204);
    expect((await tratarControles(req('POST'), 'skip', AMB, f)).status).toBe(204);
    expect((await tratarControles(req('POST'), 'replay', AMB, f)).status).toBe(204);
    expect(chamadasLivePix(f)).toEqual([
      ['https://api.livepix.gg/v2/controls', 'PATCH', '{"autoPlay":false}'],
      ['https://api.livepix.gg/v2/controls/skip', 'POST', undefined],
      ['https://api.livepix.gg/v2/controls/replay', 'POST', undefined],
    ]);
  });

  it('PATCH sem autoPlay booleano é recusado sem chamar o LivePix', async () => {
    const f = montarFetch();
    const r = await tratarControles(req('PATCH', { autoPlay: 'sim' }), 'controls', AMB, f);
    expect(r.status).toBe(400);
    expect(chamadasLivePix(f)).toEqual([]);
  });

  it('token fica em cache até perto de expirar', async () => {
    const f = montarFetch();
    await tratarControles(req('GET'), 'controls', AMB, f);
    await tratarControles(req('POST'), 'skip', AMB, f);
    expect(f.mock.calls.filter(([u]) => String(u).includes('oauth2/token'))).toHaveLength(1);
  });

  it('token perto de expirar é renovado', async () => {
    const f = montarFetch({ expiraEm: 30 }); // menos que a folga de 60 s
    await tratarControles(req('GET'), 'controls', AMB, f);
    await tratarControles(req('GET'), 'controls', AMB, f);
    expect(f.mock.calls.filter(([u]) => String(u).includes('oauth2/token'))).toHaveLength(2);
  });

  it('LivePix recusou o token (401): pega token novo e tenta uma vez de novo', async () => {
    let n = 0;
    const f = montarFetch({ controles: () => (++n === 1 ? new Response(null, { status: 401 }) : new Response(null, { status: 204 })) });
    const r = await tratarControles(req('POST'), 'skip', AMB, f);
    expect(r.status).toBe(204);
    expect(f.mock.calls.filter(([u]) => String(u).includes('oauth2/token'))).toHaveLength(2);
  });

  it('quem não está logado ou não é da equipe não chega no LivePix', async () => {
    const semLogin = montarFetch({ usuarioOk: false });
    expect((await tratarControles(req('POST'), 'skip', AMB, semLogin)).status).toBe(401);
    expect((await tratarControles(req('POST', undefined, ''), 'skip', AMB, semLogin)).status).toBe(401);
    const intruso = montarFetch({ membro: false });
    expect((await tratarControles(req('POST'), 'skip', AMB, intruso)).status).toBe(403);
    expect(chamadasLivePix(semLogin)).toEqual([]);
    expect(chamadasLivePix(intruso)).toEqual([]);
  });

  it('método errado dá 405', async () => {
    const f = montarFetch();
    expect((await tratarControles(req('GET'), 'skip', AMB, f)).status).toBe(405);
    expect((await tratarControles(req('POST'), 'controls', AMB, f)).status).toBe(405);
  });

  it('falha do LivePix vira 502 e a resposta nunca carrega o segredo', async () => {
    const f = montarFetch({ controles: () => new Response('boom segredo-super', { status: 500 }) });
    const r = await tratarControles(req('POST'), 'replay', AMB, f);
    expect(r.status).toBe(502);
    expect(await r.text()).not.toContain('segredo');
  });

  it('sem credenciais configuradas responde 500 com aviso claro', async () => {
    const f = montarFetch();
    const r = await tratarControles(req('GET'), 'controls', { ...AMB, LIVEPIX_CLIENT_SECRET: undefined }, f);
    expect(r.status).toBe(500);
    expect((await r.json()).erro).toMatch(/LIVEPIX_CLIENT_ID|LIVEPIX_CLIENT_SECRET/);
  });
});
