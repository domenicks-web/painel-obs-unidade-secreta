// Uso: (npm run dev rodando em :5173)  node scripts/print-alerta.mjs
// Print do /alerta?teste=1 (PIX fictício, só em dev) sobre fundo quadriculado pra mostrar a transparência.
import { chromium } from 'playwright-core';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const base = resolve(process.env.HOME, '.cache/ms-playwright');
const pasta = readdirSync(base).find((d) => /^chromium-\d+$/.test(d));
const exe = resolve(base, pasta, readdirSync(resolve(base, pasta)).find((d) => d.startsWith('chrome-linux')), 'chrome');

const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto('http://localhost:5173/alerta?teste=1');
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500); // já entrou, está parado
const png = await page.screenshot({ type: 'png', omitBackground: true });
const xadrez = 'repeating-conic-gradient(#9a9a9a 0 25%, #c8c8c8 0 50%) 0 0 / 40px 40px';
await page.setContent(`<body style="margin:0;background:${xadrez}"><img src="data:image/png;base64,${png.toString('base64')}"></body>`);
await page.screenshot({ path: resolve('docs/prints/alerta.png') });
await browser.close();
console.log('ok alerta');
