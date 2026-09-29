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
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173/painel?chatTeste=1'); // chat com as mensagens fictícias
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  return page;
}

// desktop, lado a lado com a referência
const nossa = await abrirPainel(1440, 900);
const b = await nossa.screenshot({ type: 'png' });
const pr = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await pr.goto(`http://localhost:${servidor.address().port}/Painel%20US.dc.html`);
await pr.evaluate(() => document.fonts.ready);
await pr.waitForTimeout(1500);
const a = await pr.screenshot({ type: 'png' });
const lado = await browser.newPage({ viewport: { width: 2900, height: 940 } });
await lado.setContent(`<body style="margin:0;display:flex;gap:20px;background:#555">
  <figure style="margin:0"><figcaption style="font:24px sans-serif;color:#fff">REFERÊNCIA · painel</figcaption><img src="data:image/png;base64,${a.toString('base64')}"></figure>
  <figure style="margin:0"><figcaption style="font:24px sans-serif;color:#fff">NOSSA · painel</figcaption><img src="data:image/png;base64,${b.toString('base64')}"></figure></body>`);
await lado.screenshot({ path: resolve('docs/prints/painel-lado-a-lado.png') });
// outras telas do painel no desktop
for (const [tecla, nome] of [['3', 'futebol'], ['7', 'lower']]) {
  await nossa.keyboard.press(tecla);
  await nossa.waitForTimeout(600);
  await nossa.screenshot({ path: resolve(`docs/prints/painel-${nome}.png`) });
}
await nossa.getByText('GALERA', { exact: true }).click();
await nossa.waitForTimeout(500);
await nossa.screenshot({ path: resolve('docs/prints/painel-galera.png') });

// controles do alerta LivePix: ativo e pausado, recorte da coluna PIX + topo
const pausado = await abrirPainel(1440, 900, false);
await pausado.screenshot({ path: resolve('docs/prints/painel-livepix-pausado.png') });
await pausado.screenshot({ path: resolve('docs/prints/painel-livepix-coluna.png'), clip: { x: 1040, y: 0, width: 400, height: 330 } });

// chat com uma mensagem em destaque, recorte da coluna da direita
estado.chatPin = { autor: 'marinaFC', txt: 'manda salve pro pessoal de BH', plataforma: 'yt' };
const comPin = await abrirPainel(1440, 900);
await comPin.screenshot({ path: resolve('docs/prints/painel-chat.png'), clip: { x: 1040, y: 330, width: 400, height: 570 } });
estado.chatPin = null;

// celular
const cel = await abrirPainel(390, 844);
const larguraDoc = await cel.evaluate(() => document.documentElement.scrollWidth);
await cel.screenshot({ path: resolve('docs/prints/painel-celular.png'), fullPage: true });
const celP = await abrirPainel(390, 844, false);
const caixa = await celP.locator('.p-pix').boundingBox();
await celP.screenshot({ path: resolve('docs/prints/painel-livepix-celular.png'), fullPage: true, clip: { x: 0, y: caixa.y, width: 390, height: 260 } });
console.log('ok painel; largura no celular =', larguraDoc);
await browser.close();
servidor.close();
