// Uso: (npm run dev rodando em :5173)  OUT=pasta node scripts/print-fila-alertas.mjs
// Print da playlist ALERTAS YT no painel, com um Realtime falso (routeWebSocket) anunciando uma fila.
// Uso: (npm run dev rodando em :5173)  node scripts/print-painel.mjs
// Print do /painel (desktop 1440 e celular 390) sem tocar no Supabase de verdade:
// a sessão e as respostas do banco são simuladas no navegador. Desktop sai lado a lado com a referência.
import { chromium } from 'playwright-core';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { createServer } from 'node:http';

const base = resolve(process.env.HOME, '.cache/ms-playwright');
const pasta = readdirSync(base).find((d) => /^chromium-\d+$/.test(d));
const exe = resolve(base, pasta, readdirSync(resolve(base, pasta)).find((d) => d.startsWith('chrome-linux')), 'chrome');
const env = readFileSync('.env.local', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const ref = new URL(url).hostname.split('.')[0];

const pastaRef = resolve('referencia');
const servidor = createServer((req, res) => {
  const arq = resolve(pastaRef, '.' + decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!arq.startsWith(pastaRef) || !existsSync(arq)) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': extname(arq) === '.html' ? 'text/html' : 'text/javascript' }).end(readFileSync(arq));
}).listen(0);

// mesmos dados que a referência do painel mostra
const estado = {
  titulo: 'OPERAÇÃO AO VIVO', ticker: 'SE INSCREVE NO CANAL ● ATIVA O SININHO ● MANDA O PIX NA DESCRIÇÃO ● A UNIDADE NÃO PARA',
  nomes: ['NOME 01', 'NOME 02', 'NOME 03', 'NOME 04', 'NOME 05', 'NOME 06'],
  galera: [{ id: '1', nome: 'NOME 01', funcao: 'UNIDADE SECRETA' }, { id: '2', nome: 'NOME 02', funcao: 'UNIDADE SECRETA' }],
  minutos: 5, timerInicio: null, msg: 'VOLTAMOS JÁ', hostCams: '1', pixLink: 'LIVEPIX.GG/UNIDADESECRETA',
  metaDesc: 'PIZZA PRA RAPAZIADA', metaTotal: 500, ajuste: 0, metaAtual: 35, pixNome: 'CAROL', pixValor: 10, topNome: 'TIAGÃO', topValor: 25,
  timeA: 'CASA', timeB: 'FORA', golsA: 0, golsB: 0, jogo: '1º TEMPO', jogoOutro: '', clockInicio: null, clockAcumulado: 0, clockRodando: false,
  enquete: { casa: 0, empate: 0, fora: 0, mostrar: false }, filme: 'NOME DO FILME', episodio: 'T1 · E3', ltNome: 'NOME 01',
  funcao: 'UNIDADE SECRETA', proximo: 'SEXTA, 21H', chatPin: null,
};
const agora = new Date().toISOString();
const pix = [
  { id: 'm', nome: 'Bia.gamer', valor: 0, msg: '', origem: 'youtube', tipo: 'membro', valor_texto: '', externo_id: 'yt:3', off: false, created_at: agora },
  { id: 's', nome: 'Lipe10', valor: 51.15, msg: 'GOLAÇO', origem: 'youtube', tipo: 'superchat', valor_texto: 'US$ 10.00', externo_id: 'yt:2', off: false, created_at: agora },
  { id: 'b', nome: 'Carol', valor: 10, msg: 'salve rapaziada', origem: 'livepix', tipo: 'pix', valor_texto: '', externo_id: 'livepix:1', off: false, created_at: agora },
  { id: 'a', nome: 'Tiagão', valor: 25, msg: 'pra pizza', origem: 'manual', tipo: 'pix', valor_texto: '', externo_id: null, off: false, created_at: agora },
];
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const exp = Math.floor(Date.now() / 1000) + 3600 * 24;
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u1', exp, role: 'authenticated' })}.x`;
const sessao = { access_token: jwt, refresh_token: 'r', token_type: 'bearer', expires_in: 86400, expires_at: exp, user: { id: 'u1', email: 'teste@x.com', aud: 'authenticated', role: 'authenticated' } };

const browser = await chromium.launch({ executablePath: exe });

async function abrirPainel(largura, altura, autoPlay = true) {
  const ctx = await browser.newContext({ viewport: { width: largura, height: altura } });
  // controles do LivePix simulados (as rotas /api/livepix/* do servidor)
  await ctx.route('**/api/livepix/**', (route) => {
    const u = route.request().url();
    if (u.endsWith('/controls') && route.request().method() === 'GET')
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ autoPlay }) });
    return route.fulfill({ status: 204, body: '' });
  });
  await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [`sb-${ref}-auth-token`, JSON.stringify(sessao)]);
  await ctx.route(`${url}/**`, (route) => {
    const u = route.request().url();
    const json = (b) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
    if (u.includes('/rpc/hora_servidor')) return json(new Date().toISOString());
    if (u.includes('/rest/v1/membros_equipe')) return json({ papel: 'admin' });
    if (u.includes('/rest/v1/salas')) return json({ estado, updated_at: new Date(Date.now() - 120000).toISOString(), updated_by_nome: 'Ramon' });
    if (u.includes('/rest/v1/apoios')) return json(pix);
    if (u.includes('/api/cambio')) return json({ taxas: { BRL: 1, USD: 0.1955 } });
    if (u.includes('/auth/v1/user')) return json(sessao.user);
    return route.fulfill({ status: 404, body: '' });
  });
  await ctx.routeWebSocket(/realtime/, (ws) => {
    ws.onMessage((raw) => {
      const texto = String(raw);
      if (!texto.startsWith('[') && !texto.startsWith('{')) {
        // mensagem binária do cliente (broadcast): só interessa o "pedir"
        if (texto.includes('pedir') && globalThis.FILA)
          ws.send(JSON.stringify([null, null, 'realtime:alerta-fila', 'broadcast', { type: 'broadcast', event: 'estado', payload: globalThis.FILA }]));
        return;
      }
      const arr = texto.startsWith('[');
      const m = arr ? (([join_ref, ref, topic, event, payload]) => ({ join_ref, ref, topic, event, payload }))(JSON.parse(raw)) : JSON.parse(raw);
      const enviar = (o) => ws.send(JSON.stringify(arr ? [o.join_ref ?? null, o.ref ?? null, o.topic, o.event, o.payload] : o));
      if (m.event === 'phx_join') {
        const pc = (m.payload?.config?.postgres_changes ?? []).map((c, i) => ({ ...c, id: i + 1 }));
        enviar({ join_ref: m.join_ref, ref: m.ref, topic: m.topic, event: 'phx_reply', payload: { status: 'ok', response: { postgres_changes: pc } } });
      } else if (m.event === 'heartbeat') {
        enviar({ ref: m.ref, topic: 'phoenix', event: 'phx_reply', payload: { status: 'ok', response: {} } });
      } else if (m.event === 'broadcast' && m.payload?.event === 'pedir' && globalThis.FILA) {
        enviar({ topic: m.topic, event: 'broadcast', payload: { type: 'broadcast', event: 'estado', payload: globalThis.FILA } });
      } else if (m.ref) {
        enviar({ join_ref: m.join_ref, ref: m.ref, topic: m.topic, event: 'phx_reply', payload: { status: 'ok', response: {} } });
      }
    });
  });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173/painel?chatTeste=1'); // chat com as mensagens fictícias
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  return page;
}
const agoraMs = Date.now();
globalThis.FILA = {
  instancia: 'obs', pausado: false,
  atual: { id: 'a1', tipo: 'superchat', nome: 'Lipe10', valor: 'US$ 10.00', msg: 'GOLAÇO DO TIMÃO' },
  fila: [
    { id: 'a2', tipo: 'sticker', nome: 'marinaFC', valor: 'R$ 20,00' },
    { id: 'a3', tipo: 'membro', nome: 'Bia.gamer' },
    { id: 'a4', tipo: 'superchat', nome: 'Tiago_BH', valor: 'R$ 50,00', msg: 'manda salve pro pessoal de BH' },
  ],
  historico: [
    { id: 'a1', tipo: 'superchat', nome: 'Lipe10', valor: 'US$ 10.00', msg: 'GOLAÇO DO TIMÃO', tocadoEm: agoraMs },
    { id: 'a0', tipo: 'superchat', nome: 'Duda', valor: 'R$ 5,00', msg: 'salve rapaziada', tocadoEm: agoraMs - 120000 },
  ],
};
const out = process.env.OUT;
const p = await abrirPainel(1440, 900);
await p.waitForTimeout(1500);
await p.locator('.p-alertas').scrollIntoViewIfNeeded();
await p.screenshot({ path: out + '/fila-coluna.png', clip: { x: 1040, y: 0, width: 400, height: 900 } });
globalThis.FILA = undefined;
const f = await abrirPainel(1440, 900);
await f.waitForTimeout(1500);
await f.screenshot({ path: out + '/fila-fora.png', clip: { x: 1040, y: 300, width: 400, height: 400 } });
await browser.close(); servidor.close();
