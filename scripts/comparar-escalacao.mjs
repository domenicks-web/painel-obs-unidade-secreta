// Uso: (npm run dev rodando em :5173)  node scripts/comparar-escalacao.mjs
// ESCALAÇÃO: os 8 quadros da referência × /tela/escalacao com fixture e os mesmos casos.
import { chromium } from 'playwright-core';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
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

const CASOS = [
  ['1a', 'lista,casa,4,4-3-3,4-3-3'],
  ['1b', 'lista,casa,6,4-3-3,4-3-3'],
  ['1c', 'lista,ambos,4,4-2-3-1,4-3-3'],
  ['1d', 'lista,ambos,6,4-2-3-1,4-3-3'],
  ['2a', 'campo,casa,4,4-3-3,4-2-3-1'],
  ['2b', 'campo,ambos,6,4-2-3-1,3-5-2'],
  ['2c', 'campo,visitante,5,4-4-2,5-3-2'],
  ['2d', 'lista,visitante,4,4-4-2,4-3-3'],
];
const so = process.argv[2];
const browser = await chromium.launch({ executablePath: exe });

const ref = await browser.newPage({ viewport: { width: 1900, height: 1200 } });
await ref.goto(`http://localhost:${servidor.address().port}/Tela%20Escalacao.dc.html`);
await ref.evaluate(() => document.fonts.ready);
await ref.waitForTimeout(2000);
const nossa = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

const linhas = [];
for (const [id, esc] of CASOS) {
  if (so && so !== id) continue;
  const quadro = ref.locator(`[id="${id}"] div[style*="864px"]`).first();
  await quadro.scrollIntoViewIfNeeded();
  const a = (await quadro.screenshot()).toString('base64');
  await nossa.goto(`http://localhost:5173/tela/escalacao?fixture=referencia&esc=${esc}`);
  await nossa.addStyleTag({ content: 'html,body{background:#0f0c0e!important}' });
  await nossa.evaluate(() => document.fonts.ready);
  await nossa.waitForTimeout(900);
  const b = (await nossa.screenshot()).toString('base64');
  linhas.push(`<div>${id}<br><small>${esc}</small></div><img src="data:image/png;base64,${a}"><img src="data:image/png;base64,${b}">`);
}
const lado = await browser.newPage({ viewport: { width: 1900, height: 500 } });
await lado.setContent(`<body style="margin:0;padding:10px;background:#555;font:18px sans-serif;color:#fff;display:grid;grid-template-columns:120px 864px 864px;gap:10px;align-items:center">
  <div></div><div>REFERÊNCIA</div><div>NOSSA (/tela/escalacao)</div>
  ${linhas.join('').replaceAll('<img ', '<img style="width:864px" ')}</body>`);
const saida = resolve(`docs/prints/escalacao${so ? '-' + so : ''}-lado-a-lado.png`);
await lado.screenshot({ path: saida, fullPage: true });
console.log('ok', saida);
await browser.close();
servidor.close();
