// Uso: (npm run dev rodando em :5173)  node scripts/comparar-telas.mjs [id ...]
// Tira print 1920x1080 da referência e da nossa tela com os mesmos dados e junta lado a lado.
import { chromium } from 'playwright-core';
import { readdirSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { createServer } from 'node:http';

const TODAS = ['inicio', 'host', 'futebol', 'filme', 'mesa', 'intervalo', 'lower', 'tecnico', 'fim'];
const TELAS = process.argv.length > 2 ? process.argv.slice(2) : TODAS;
const base = resolve(process.env.HOME, '.cache/ms-playwright');
const pasta = readdirSync(base).find((d) => /^chromium-\d+$/.test(d));
const exe = resolve(base, pasta, readdirSync(resolve(base, pasta)).find((d) => d.startsWith('chrome-linux')), 'chrome');
// a referência carrega o Slot Camera via fetch (dc-import), que não funciona em file://: serve por http
const pastaRef = resolve('referencia');
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
const servidor = createServer((req, res) => {
  const arq = resolve(pastaRef, '.' + decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!arq.startsWith(pastaRef) || !existsSync(arq)) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': TIPOS[extname(arq)] || 'application/octet-stream' }).end(readFileSync(arq));
}).listen(0);
const ref = `http://localhost:${servidor.address().port}/Telas%20Live.dc.html`;
const saida = resolve('docs/prints');
mkdirSync(saida, { recursive: true });

const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
// congela todas as animações no mesmo instante (1 s) dos dois lados: compara posição, não quadro de animação
const congelar = `*,*::before,*::after{animation-play-state:paused!important;animation-delay:-1s!important}`;

async function print(url) {
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: congelar });
  await page.waitForTimeout(800);
  return page.screenshot({ type: 'png' });
}

for (const id of TELAS) {
  const a = await print(`${ref}?tela=${id}`);
  const b = await print(`http://localhost:5173/tela/${id}?fixture=referencia`);
  const html = `<body style="margin:0;display:flex;gap:20px;background:#555">
    <figure style="margin:0"><figcaption style="font:24px sans-serif;color:#fff">REFERÊNCIA · ${id}</figcaption><img src="data:image/png;base64,${a.toString('base64')}"></figure>
    <figure style="margin:0"><figcaption style="font:24px sans-serif;color:#fff">NOSSA · ${id}</figcaption><img src="data:image/png;base64,${b.toString('base64')}"></figure></body>`;
  const lado = await browser.newPage({ viewport: { width: 3860, height: 1120 } });
  await lado.setContent(html);
  await lado.screenshot({ path: resolve(saida, `${id}-lado-a-lado.png`) });
  await lado.close();
  console.log('ok', id);
}
await browser.close();
servidor.close();
