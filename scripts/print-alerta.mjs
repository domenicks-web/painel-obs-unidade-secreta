// Uso: (npm run dev rodando em :5173)  node scripts/print-alerta.mjs
// /alerta?teste=1 × referência (Alerta YT.dc.html), com os mesmos dados (Math.random travado),
// um print por tipo: superchat, super sticker e membro. Saída: docs/prints/alerta-<tipo>-lado-a-lado.png
import { chromium } from 'playwright-core';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { createServer } from 'node:http';

const base = resolve(process.env.HOME, '.cache/ms-playwright');
const pasta = readdirSync(base).find((d) => /^chromium-\d+$/.test(d));
const exe = resolve(base, pasta, readdirSync(resolve(base, pasta)).find((d) => d.startsWith('chrome-linux')), 'chrome');
const pastaRef = resolve('referencia');
const servidor = createServer((req, res) => {
  const arq = resolve(pastaRef, '.' + decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!arq.startsWith(pastaRef) || !existsSync(arq)) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': extname(arq) === '.html' ? 'text/html' : 'text/javascript' }).end(readFileSync(arq));
}).listen(0);
const ref = `http://localhost:${servidor.address().port}/Alerta%20YT.dc.html`;
const browser = await browser_();
async function browser_() {
  return chromium.launch({ executablePath: exe });
}
const congelar = `*,*::before,*::after{animation-play-state:paused!important}`;

// [botão, Math.random] → nome, valor e mensagem iguais nos dois lados
const TIPOS = [
  ['superchat', '+ SUPERCHAT', 0.5],
  ['sticker', '+ SUPER STICKER', 0.8],
  ['membro', '+ MEMBRO', 0.4],
];

async function print(url, botao, r) {
  const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
  await page.addInitScript((v) => (Math.random = () => v), r);
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: botao, exact: true }).click();
  await page.waitForTimeout(2500); // entrou, carimbo parado, barra andando
  await page.addStyleTag({ content: congelar });
  const png = await page.screenshot({ type: 'png' });
  await page.close();
  return png;
}

for (const [tipo, botao, r] of TIPOS) {
  const a = await print(ref, botao, r);
  const b = await print('http://localhost:5173/alerta?teste=1', botao, r);
  const lado = await browser.newPage({ viewport: { width: 2220, height: 740 } });
  await lado.setContent(`<body style="margin:0;display:flex;gap:20px;background:#555">
    <figure style="margin:0"><figcaption style="font:20px sans-serif;color:#fff">REFERÊNCIA · ${tipo}</figcaption><img src="data:image/png;base64,${a.toString('base64')}"></figure>
    <figure style="margin:0"><figcaption style="font:20px sans-serif;color:#fff">NOSSA · ${tipo}</figcaption><img src="data:image/png;base64,${b.toString('base64')}"></figure></body>`);
  await lado.screenshot({ path: resolve(`docs/prints/alerta-${tipo}-lado-a-lado.png`) });
  await lado.close();
  console.log('ok', tipo);
}
await browser.close();
servidor.close();
