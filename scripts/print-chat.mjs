// Uso: (npm run dev rodando em :5173)  node scripts/print-chat.mjs
// Página de teste do chat: referência × nossa (/chat?teste=1), com as mesmas mensagens nas duas
// (Math.random travado no mesmo valor antes de cada clique), e a nossa com uma mensagem em destaque.
import { chromium } from 'playwright-core';
import { readdirSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { createServer } from 'node:http';

const base = resolve(process.env.HOME, '.cache/ms-playwright');
const pasta = readdirSync(base).find((d) => /^chromium-\d+$/.test(d));
const exe = resolve(base, pasta, readdirSync(resolve(base, pasta)).find((d) => d.startsWith('chrome-linux')), 'chrome');
const pastaRef = resolve('referencia');
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript' };
const servidor = createServer((req, res) => {
  const arq = resolve(pastaRef, '.' + decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!arq.startsWith(pastaRef) || !existsSync(arq)) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': TIPOS[extname(arq)] || 'application/octet-stream' }).end(readFileSync(arq));
}).listen(0);
const ref = `http://localhost:${servidor.address().port}/Chat%20US.dc.html`;
const saida = resolve('docs/prints');
mkdirSync(saida, { recursive: true });

const browser = await chromium.launch({ executablePath: exe });
const congelar = `*,*::before,*::after{animation-play-state:paused!important;animation-delay:-2s!important}`;

// [botão, valor do Math.random]: <0.15 MOD, <0.3 membro; o valor escolhe nome e mensagem
const PASSOS = [
  ['+ MENSAGEM ALEATÓRIA', 0.52],
  ['+ SUPERCHAT', 0.34],
  ['+ MENSAGEM ALEATÓRIA', 0.12],
  ['+ NOVO MEMBRO', 0.66],
  ['+ MENSAGEM ALEATÓRIA', 0.23],
  ['+ MENSAGEM ALEATÓRIA', 0.91],
];

async function print(url, destacar = false) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.addInitScript(() => {
    window.__r = 0.4;
    Math.random = () => window.__r;
  });
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2200); // as 4 mensagens iniciais
  for (const [botao, r] of PASSOS) {
    await page.evaluate((v) => (window.__r = v), r);
    await page.getByRole('button', { name: botao, exact: true }).click();
  }
  if (destacar) await page.getByRole('button', { name: '★ DESTACAR ÚLTIMA' }).click();
  await page.addStyleTag({ content: congelar });
  await page.waitForTimeout(600);
  const png = await page.screenshot({ type: 'png' });
  await page.close();
  return png;
}

const a = await print(ref);
const b = await print('http://localhost:5173/chat?teste=1');
const c = await print('http://localhost:5173/chat?teste=1', true);
const fig = (t, png) =>
  `<figure style="margin:0"><figcaption style="font:24px sans-serif;color:#fff">${t}</figcaption><img src="data:image/png;base64,${png.toString('base64')}"></figure>`;
const lado = await browser.newPage({ viewport: { width: 3860, height: 1120 } });
await lado.setContent(`<body style="margin:0;display:flex;gap:20px;background:#555">${fig('REFERÊNCIA · chat', a)}${fig('NOSSA · /chat?teste=1', b)}</body>`);
await lado.screenshot({ path: resolve(saida, 'chat-lado-a-lado.png') });
await lado.close();
const unica = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await unica.setContent(`<body style="margin:0"><img src="data:image/png;base64,${c.toString('base64')}"></body>`);
await unica.screenshot({ path: resolve(saida, 'chat-destaque.png') });
console.log('ok chat-lado-a-lado.png, chat-destaque.png');
await browser.close();
servidor.close();
