// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { tratarComando, type Ambiente } from './livepix';

const AMB: Ambiente = {
  LIVEPIX_URL_PAUSAR: 'https://api.livepix.gg/remote-controls/SEGREDO/alerts/pause',
  LIVEPIX_URL_RETOMAR: 'https://api.livepix.gg/remote-controls/SEGREDO/alerts/resume',
  LIVEPIX_URL_PULAR: 'https://api.livepix.gg/remote-controls/SEGREDO/alerts/skip',
  LIVEPIX_URL_REPETIR: 'https://api.livepix.gg/remote-controls/SEGREDO/alerts/replay',
  LIVEPIX_URL_LIMPAR: 'https://api.livepix.gg/remote-controls/SEGREDO/alerts/clear',
  SUPABASE_URL: 'https://sb.test',
  SUPABASE_ANON_KEY: 'anon',
};

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } });

// fetch falso: responde Supabase (usuário, membro, registro) e os links do LivePix
function montarFetch(opcoes: { membro?: boolean; usuarioOk?: boolean; livepix?: number; registroOk?: boolean; livepixCai?: boolean } = {}) {
  const { membro = true, usuarioOk = true, livepix = 204, registroOk = true } = opcoes;
  return vi.fn(async (entrada: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(entrada);
    if (url === 'https://sb.test/auth/v1/user') return usuarioOk ? json({ id: 'u1' }) : json({ msg: 'invalid' }, 401);
    if (url.startsWith('https://sb.test/rest/v1/membros_equipe')) return json(membro ? [{ papel: 'editor' }] : []);
    if (url === 'https://sb.test/rest/v1/rpc/registrar_comando_livepix') {
      if (!registroOk) return json({ message: 'erro' }, 400);
      const { p_comando } = JSON.parse(String(init.body));
      return json({ id: 1, pausado: p_comando === 'pausar', ultimo_comando: p_comando, por_nome: 'Ana', em: '2026-09-29T15:00:00Z' });
    }
    if (url.startsWith('https://api.livepix.gg/remote-controls/SEGREDO/')) {
      if (opcoes.livepixCai) throw new Error(`falhou ${url}`);
      return new Response(livepix === 204 ? null : '{"message":"x"}', { status: livepix });
    }
    throw new Error('url inesperada ' + url);
  });
}

const req = (metodo = 'POST', auth = 'Bearer jwt-do-usuario') =>
  new Request('https://site.test/api/livepix/x', { method: metodo, headers: { authorization: auth } });

const urlsChamadas = (f: ReturnType<typeof montarFetch>) => f.mock.calls.map((c) => String(c[0]));

describe('tratarComando', () => {
  it.each([
    ['pausar', 'pause'],
    ['retomar', 'resume'],
    ['pular', 'skip'],
    ['repetir', 'replay'],
    ['limpar', 'clear'],
  ])('%s chama o link certo com POST e registra no banco', async (comando, fim) => {
    const f = montarFetch();
    const r = await tratarComando(req(), comando, AMB, f);
    expect(r.status).toBe(200);
    const chamadaLivePix = f.mock.calls.find((c) => String(c[0]).includes('/remote-controls/'))!;
    expect(String(chamadaLivePix[0])).toBe(`https://api.livepix.gg/remote-controls/SEGREDO/alerts/${fim}`);
    expect(chamadaLivePix[1]).toEqual({ method: 'POST' });
    const registro = f.mock.calls.find((c) => String(c[0]).endsWith('/rpc/registrar_comando_livepix'))!;
    expect(new Headers(registro[1]!.headers).get('authorization')).toBe('Bearer jwt-do-usuario');
    expect(JSON.parse(String(registro[1]!.body))).toEqual({ p_comando: comando });
    const corpo = await r.json();
    expect(corpo.estado.ultimo_comando).toBe(comando);
  });

  it('só aceita POST', async () => {
    const f = montarFetch();
    expect((await tratarComando(req('GET'), 'pular', AMB, f)).status).toBe(405);
    expect(f).not.toHaveBeenCalled();
  });

  it('comando desconhecido: 404', async () => {
    expect((await tratarComando(req(), 'explodir', AMB, montarFetch())).status).toBe(404);
  });

  it('sem o link configurado: 500 dizendo qual variável falta', async () => {
    const r = await tratarComando(req(), 'limpar', { ...AMB, LIVEPIX_URL_LIMPAR: undefined }, montarFetch());
    expect(r.status).toBe(500);
    expect((await r.json()).erro).toContain('LIVEPIX_URL_LIMPAR');
  });

  it('sem login: 401 e não chama o LivePix', async () => {
    const f = montarFetch({ usuarioOk: false });
    expect((await tratarComando(req(), 'pular', AMB, f)).status).toBe(401);
    expect((await tratarComando(req('POST', ''), 'pular', AMB, f)).status).toBe(401);
    expect(urlsChamadas(f).some((u) => u.includes('livepix'))).toBe(false);
  });

  it('fora da equipe: 403 e não chama o LivePix', async () => {
    const f = montarFetch({ membro: false });
    expect((await tratarComando(req(), 'limpar', AMB, f)).status).toBe(403);
    expect(urlsChamadas(f).some((u) => u.includes('livepix'))).toBe(false);
  });

  it('LivePix recusa: 502 e não registra', async () => {
    const f = montarFetch({ livepix: 500 });
    const r = await tratarComando(req(), 'pausar', AMB, f);
    expect(r.status).toBe(502);
    expect(urlsChamadas(f).some((u) => u.includes('/rpc/'))).toBe(false);
  });

  it('LivePix fora do ar: 502 sem vazar o link', async () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = await tratarComando(req(), 'pular', AMB, montarFetch({ livepixCai: true }));
    expect(r.status).toBe(502);
    expect(await r.text()).not.toContain('SEGREDO');
    erro.mockRestore();
  });

  it('registro falha depois do LivePix aceitar: ainda é sucesso (não repetir o comando)', async () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = await tratarComando(req(), 'pular', AMB, montarFetch({ registroOk: false }));
    expect(r.status).toBe(200);
    expect((await r.json()).estado).toBeNull();
    erro.mockRestore();
  });

  it('nenhuma resposta leva o link pro navegador', async () => {
    for (const comando of ['pausar', 'retomar', 'pular', 'repetir', 'limpar']) {
      const r = await tratarComando(req(), comando, AMB, montarFetch());
      expect(await r.text()).not.toContain('SEGREDO');
    }
  });
});
