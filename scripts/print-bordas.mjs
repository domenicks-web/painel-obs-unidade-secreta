// Uso: (npm run dev rodando em :5173)  node scripts/print-bordas.mjs <nome>
// Print 1920×1080 das telas com caixa girada e recorte com zoom 6× (sem suavizar) das bordas,
// pra comparar serrilhado antes/depois. Saída: docs/prints/bordas-<nome>.png
import { chromium } from 'playwright-core';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const nome = process.argv[2] || 'atual';
const base = resolve(process.env.HOME, '.cache/ms-playwright');
const pasta = readdirSync(base).find((d) => /^chromium-\d+$/.test(d));
const exe = resolve(base, pasta, readdirSync(resolve(base, pasta)).find((d) => d.startsWith('chrome-linux')), 'chrome');
// GPU ligada como no OBS (CEF acelerado); sem ela o Chromium rasteriza tudo em software
const browser = await chromium.launch({ executablePath: exe, args: ['--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
// congela as animações num quadro girado (o logo do início fica em ~-2,6°)
const congelar = `*,*::before,*::after{animation-play-state:paused!important;animation-delay:-1s!important}`;

// [tela, seletor, onde recortar]: 'bd' = canto de baixo-direita da caixa (com a sombra);
// {altura, graus, extra} = borda de cima de uma faixa girada, no meio da tela (extra = sombra)
const ALVOS = [
  ['inicio', '.t-inicio__logo', 'bd'],
  ['fim', '.t-fim__faixa', { altura: 170, graus: 10, extra: 8 }],
];
const recortes = [];
for (const [tela, sel, canto] of ALVOS) {
  await page.goto(`http://localhost:5173/tela/${tela}?fixture=referencia`);
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: congelar });
  await page.waitForTimeout(700);
  const cheia = await page.screenshot({ type: 'png' });
  const r = await page.locator(sel).evaluate((el) => {
    const b = el.getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  });
  const T = 110;
  let x, y;
  if (canto === 'bd') [x, y] = [r.x + r.w - T + 10, r.y + r.h - T + 10];
  else {
    const borda = r.y + r.h / 2 - canto.altura / 2 / Math.cos((canto.graus * Math.PI) / 180) - canto.extra;
    [x, y] = [r.x + r.w / 2 - T / 2, borda - T / 2];
  }
  x = Math.max(0, Math.min(1920 - T, Math.round(x)));
  y = Math.max(0, Math.min(1080 - T, Math.round(y)));
  recortes.push({ tela, cheia: cheia.toString('base64'), x, y, T });
}
const Z = 6;
const html = `<body style="margin:0;background:#555;display:flex;gap:16px;padding:16px;font:20px sans-serif;color:#fff">${recortes
  .map(
    (c) => `<figure style="margin:0"><figcaption>${c.tela} · ${nome} · zoom ${Z}×</figcaption>
    <div style="width:${c.T * Z}px;height:${c.T * Z}px;overflow:hidden;position:relative">
      <img src="data:image/png;base64,${c.cheia}" style="position:absolute;left:${-c.x * Z}px;top:${-c.y * Z}px;width:${1920 * Z}px;image-rendering:pixelated"></div></figure>`,
  )
  .join('')}</body>`;
const lado = await browser.newPage({ viewport: { width: ALVOS.length * (110 * Z + 16) + 16, height: 110 * Z + 70 } });
await lado.setContent(html);
await lado.waitForTimeout(300);
await lado.screenshot({ path: resolve(`docs/prints/bordas-${nome}.png`) });
console.log('ok', `docs/prints/bordas-${nome}.png`);
await browser.close();
