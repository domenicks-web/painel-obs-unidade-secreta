// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { esquecerToken, tratarAlertaLivePix, tratarCambio, tratarWebhookLivePix, type AmbienteApoios } from './apoios';

const AMB: AmbienteApoios = {
  LIVEPIX_URL_PAUSAR: 'https://api.livepix.gg/remote-controls/SEGREDO/alerts/pause',
  LIVEPIX_URL_RETOMAR: 'https://api.livepix.gg/remote-controls/SEGREDO/alerts/resume',
  SUPABASE_URL: 'https://sb.test',
  SUPABASE_ANON_KEY: 'anon',
  SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_x',
  LIVEPIX_CLIENT_ID: 'cid',
  LIVEPIX_CLIENT_SECRET: 'csec',
  ALERTA_CHAVE: 'chave-do-alerta',
};

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } });
const post = (corpo: unknown, cabecalhos: Record<string, string> = {}) =>
  new Request('https://x/api', { method: 'POST', headers: { 'content-type': 'application/json', ...cabecalhos }, body: JSON.stringify(corpo) });

beforeEach(() => esquecerToken());

describe('webhook do LivePix', () => {
  function montar(opcoes: { mensagem?: number; moeda?: string; valor?: number; tokenFalha?: boolean } = {}) {
    const rpc: unknown[] = [];
    const f = vi.fn(async (entrada: RequestInfo | URL, init: RequestInit = {}) => {
      const url = String(entrada);
      if (url === 'https://oauth.livepix.gg/oauth2/token') {
        if (opcoes.tokenFalha) return json({}, 400);
        const corpo = new URLSearchParams(String(init.body));
        expect(corpo.get('grant_type')).toBe('client_credentials');
        expect(corpo.get('scope')).toBe('messages:read');
        return json({ access_token: 'tk', expires_in: 3600 });
      }
      if (url.startsWith('https://api.livepix.gg/v2/messages/')) {
        expect((init.headers as Record<string, string>).authorization).toBe('Bearer tk');
        if (opcoes.mensagem && opcoes.mensagem !== 200) return json({}, opcoes.mensagem);
        return json({ data: { id: 'm1', username: 'Harry', message: 'olá', amount: opcoes.valor ?? 1050, currency: opcoes.moeda ?? 'BRL' } });
      }
      if (url === 'https://sb.test/rest/v1/rpc/registrar_pix_livepix') {
        const h = init.headers as Record<string, string>;
        expect(h.apikey).toBe('sb_secret_x');
        expect(h.authorization).toBeUndefined(); // chave nova não vai no Authorization
        rpc.push(JSON.parse(String(init.body)));
        return json({ id: 'a1' });
      }
      throw new Error('inesperado ' + url);
    });
    return { f, rpc };
  }
  const aviso = { userId: 'u', clientId: 'c', event: 'new', resource: { id: 'm1', reference: 'r', type: 'message' } };

  it('busca a mensagem na API e grava em reais, com o id do LivePix', async () => {
    const { f, rpc } = montar();
    const r = await tratarWebhookLivePix(post(aviso), AMB, f);
    expect(r.status).toBe(200);
    expect(rpc).toEqual([{ p_externo: 'livepix:m1', p_nome: 'Harry', p_valor: 10.5, p_msg: 'olá' }]);
  });

  it('ignora o que não é mensagem nova, e id esquisito', async () => {
    const { f, rpc } = montar();
    for (const a of [{ ...aviso, event: 'cancelled' }, { ...aviso, resource: { id: 'm1', type: 'subscription' } }, { ...aviso, resource: { id: '../x', type: 'message' } }]) {
      expect((await tratarWebhookLivePix(post(a), AMB, f)).status).toBe(200);
    }
    expect(rpc).toHaveLength(0);
    expect(f).not.toHaveBeenCalled();
  });

  it('mensagem que a API não conhece não entra (aviso falso) e não pede nova tentativa', async () => {
    const { f, rpc } = montar({ mensagem: 404 });
    expect((await tratarWebhookLivePix(post(aviso), AMB, f)).status).toBe(200);
    expect(rpc).toHaveLength(0);
  });

  it('cripto ou valor zero não entram', async () => {
    const a = montar({ moeda: 'BTC' });
    await tratarWebhookLivePix(post(aviso), AMB, a.f);
    const b = montar({ valor: 0 });
    await tratarWebhookLivePix(post(aviso), AMB, b.f);
    expect([...a.rpc, ...b.rpc]).toHaveLength(0);
  });

  it('LivePix fora do ar: 502 pra ele tentar de novo', async () => {
    const { f } = montar({ mensagem: 500 });
    expect((await tratarWebhookLivePix(post(aviso), AMB, f)).status).toBe(502);
    esquecerToken();
    const t = montar({ tokenFalha: true });
    expect((await tratarWebhookLivePix(post(aviso), AMB, t.f)).status).toBe(502);
  });

  it('sem credenciais: 500 explicando', async () => {
    const r = await tratarWebhookLivePix(post(aviso), { ...AMB, LIVEPIX_CLIENT_ID: undefined }, vi.fn());
    expect(r.status).toBe(500);
  });

  it('reaproveita o token entre avisos', async () => {
    const { f } = montar();
    await tratarWebhookLivePix(post(aviso), AMB, f);
    await tratarWebhookLivePix(post(aviso), AMB, f);
    expect(f.mock.calls.filter(([u]) => String(u).includes('oauth2/token'))).toHaveLength(1);
  });
});

describe('câmbio', () => {
  it('devolve as cotações com cache de 6 h', async () => {
    const f = vi.fn(async () => json({ result: 'success', rates: { BRL: 1, USD: 0.2 }, time_last_update_utc: 'x' }));
    const r = await tratarCambio(new Request('https://x/api/cambio'), f);
    expect(await r.json()).toMatchObject({ base: 'BRL', taxas: { USD: 0.2 }, fonte: 'open.er-api.com' });
    expect(r.headers.get('cache-control')).toContain('s-maxage=21600');
  });
  it('fonte fora: tabela fixa', async () => {
    const r = await tratarCambio(new Request('https://x/api/cambio'), vi.fn(async () => json({}, 500)));
    expect(await r.json()).toMatchObject({ fonte: 'tabela fixa', taxas: { BRL: 1 } });
  });
});

describe('alerta pausando o LivePix', () => {
  function montar(decisao: string, livepixOk = true) {
    const chamadas: string[] = [];
    const f = vi.fn(async (entrada: RequestInfo | URL, init: RequestInit = {}) => {
      const url = String(entrada);
      if (url === 'https://sb.test/rest/v1/rpc/alerta_livepix') {
        const { p_acao } = JSON.parse(String(init.body));
        chamadas.push(`rpc:${p_acao}`);
        return json(chamadas.length === 1 ? decisao : 'retomar');
      }
      chamadas.push(url.split('/').pop()!);
      return new Response(null, { status: livepixOk ? 204 : 500 });
    });
    return { f, chamadas };
  }
  const chave = { 'x-alerta-chave': 'chave-do-alerta' };

  it('segurar: o banco decide pausar e chama o link de pausa', async () => {
    const { f, chamadas } = montar('pausar');
    const r = await tratarAlertaLivePix(post({ acao: 'segurar' }, chave), AMB, f);
    expect(await r.json()).toEqual({ resultado: 'pausar' });
    expect(chamadas).toEqual(['rpc:segurar', 'pause']);
  });

  it('já pausado pela equipe: não chama o LivePix', async () => {
    const { f, chamadas } = montar('ja_pausado');
    await tratarAlertaLivePix(post({ acao: 'segurar' }, chave), AMB, f);
    expect(chamadas).toEqual(['rpc:segurar']);
  });

  it('soltar: retoma só quando o banco manda', async () => {
    const a = montar('retomar');
    await tratarAlertaLivePix(post({ acao: 'soltar' }, chave), AMB, a.f);
    expect(a.chamadas).toEqual(['rpc:soltar', 'resume']);
    const b = montar('nada');
    await tratarAlertaLivePix(post({ acao: 'soltar' }, chave), AMB, b.f);
    expect(b.chamadas).toEqual(['rpc:soltar']);
  });

  it('LivePix não pausou: desfaz no banco e avisa', async () => {
    const { f, chamadas } = montar('pausar', false);
    const r = await tratarAlertaLivePix(post({ acao: 'segurar' }, chave), AMB, f);
    expect(r.status).toBe(502);
    expect(chamadas).toEqual(['rpc:segurar', 'pause', 'rpc:soltar']);
  });

  it('sem chave ou chave errada: 401, sem tocar em nada', async () => {
    const { f } = montar('pausar');
    expect((await tratarAlertaLivePix(post({ acao: 'segurar' }), AMB, f)).status).toBe(401);
    expect((await tratarAlertaLivePix(post({ acao: 'segurar' }, { 'x-alerta-chave': 'chave-do-alertX' }), AMB, f)).status).toBe(401);
    expect(f).not.toHaveBeenCalled();
  });

  it('ação desconhecida: 400', async () => {
    const { f } = montar('pausar');
    expect((await tratarAlertaLivePix(post({ acao: 'pular' }, chave), AMB, f)).status).toBe(400);
  });
});
