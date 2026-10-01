// Uso: (npm run dev rodando em :5173)  node scripts/comparar-gol.mjs
// Animação de gol: referência × nossa (/gol), congeladas nos mesmos instantes (Web Animations API).
import { chromium } from 'playwright-core';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { createServer } from 'node:http';

const base = resolve(process.env.HOME, '.cache/ms-playwright');
const pasta = readdirSync(base).find((d) => /^chromium-\d+$/.test(d));
const exe = resolve(base, pasta, readdirSync(resolve(base, pasta)).find((d) => d.startsWith('chrome-linux')), 'chrome');
const url = readFileSync('.env.local', 'utf8').match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const pastaRef = resolve('referencia');
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript' };
const servidor = createServer((req, res) => {
  const arq = resolve(pastaRef, '.' + decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!arq.startsWith(pastaRef) || !existsSync(arq)) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': TIPOS[extname(arq)] || 'application/octet-stream' }).end(readFileSync(arq));
}).listen(0);

const INSTANTES = [300, 650, 1000, 1600, 3700];
const congelar = (ms) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = ms; });
const browser = await chromium.launch({ executablePath: exe });

// referência: clica + GOL do BRASIL; o palco 1920×1080 está em escala .5
const ref = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2 });
await ref.goto(`http://localhost:${servidor.address().port}/Animacao%20Gol.dc.html`);
await ref.evaluate(() => document.fonts.ready);
await ref.waitForTimeout(1500);
await ref.getByText('+ GOL').first().click();
await ref.waitForTimeout(50);
const palco = await ref.locator('div[style*="1920px"]').first().boundingBox();
const quadrosRef = [];
for (const t of INSTANTES) {
  await ref.evaluate(congelar, t);
  quadrosRef.push((await ref.screenshot({ clip: palco })).toString('base64'));
}

// nossa: /gol com o mesmo placar e um gol "agora" vindo do banco
// o mesmo gol em toda consulta (a fonte recarrega o estado ao reconectar e não pode ver um gol "novo")
let golSimulado = null;
const nossa = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await nossa.route(`${url}/**`, (route) => {
  const u = route.request().url();
  const json = (b) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
  if (u.includes('/rpc/hora_servidor')) return json(new Date().toISOString());
  if (u.includes('/rest/v1/salas')) {
    golSimulado ??= { id: 'g' + Date.now(), lado: 'A', a: 1, b: 0, em: Date.now(), dur: 4, anim: true };
    return json({
      estado: { timeA: 'BRASIL', timeB: 'INDIA', golsA: 1, golsB: 0, golEvento: golSimulado },
      updated_at: new Date().toISOString(),
      updated_by_nome: null,
      versao: 1,
    });
  }
  return route.fulfill({ status: 404, body: '' });
});
await nossa.goto('http://localhost:5173/gol');
await nossa.addStyleTag({ content: 'html,body{background:#1d181b!important}' });
await nossa.evaluate(() => document.fonts.ready);
await nossa.waitForSelector('.g-anim');
const quadrosNossos = [];
for (const t of INSTANTES) {
  await nossa.evaluate(congelar, t);
  quadrosNossos.push((await nossa.screenshot()).toString('base64'));
}

const lado = await browser.newPage({ viewport: { width: 1000, height: 300 } });
await lado.setContent(`<body style="margin:0;padding:10px;background:#555;font:16px sans-serif;color:#fff;display:grid;grid-template-columns:auto 480px 480px;gap:10px;align-items:center">
  <div></div><div>REFERÊNCIA</div><div>NOSSA (/gol)</div>
  ${INSTANTES.map((t, i) => `<div>${t / 1000}s</div><img style="width:480px" src="data:image/png;base64,${quadrosRef[i]}"><img style="width:480px" src="data:image/png;base64,${quadrosNossos[i]}">`).join('')}</body>`);
await lado.screenshot({ path: resolve('docs/prints/gol-lado-a-lado.png'), fullPage: true });
console.log('ok docs/prints/gol-lado-a-lado.png');
await browser.close();
servidor.close();
