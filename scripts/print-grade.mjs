// Uso: (npm run dev rodando em :5173)  node scripts/print-grade.mjs
// Grade automática de câmeras: mosaico de cada tela com cada quantidade, e o modo câmeras manuais.
// O estado vem simulado no navegador (não toca no Supabase).
import { chromium } from 'playwright-core';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const base = resolve(process.env.HOME, '.cache/ms-playwright');
const pasta = readdirSync(base).find((d) => /^chromium-\d+$/.test(d));
const exe = resolve(base, pasta, readdirSync(resolve(base, pasta)).find((d) => d.startsWith('chrome-linux')), 'chrome');
const url = readFileSync('.env.local', 'utf8').match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const nomes = ['ANA', 'BRUNO', 'CAROL', 'DUDA', 'ENZO', 'FE'];
const enquete = { casa: 45, empate: 20, fora: 35, mostrar: true };
const congelar = '*,*::before,*::after{animation-play-state:paused!important;animation-delay:-1s!important}';

const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
let estado = {};
await page.route(`${url}/**`, (route) => {
  const u = route.request().url();
  if (u.includes('/rest/v1/salas'))
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ estado, updated_at: new Date().toISOString(), updated_by_nome: null, versao: 1 }) });
  if (u.includes('/rpc/hora_servidor')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(new Date().toISOString()) });
  return route.fulfill({ status: 404, body: '' });
});

async function print(tela, e) {
  estado = { nomes, ...e };
  await page.goto(`http://localhost:5173/tela/${tela}`);
  await page.addStyleTag({ content: congelar });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  return (await page.screenshot({ type: 'png' })).toString('base64');
}

async function mosaico(arquivo, quadros, colunas = 3) {
  const m = await browser.newPage({ viewport: { width: colunas * 660 + 20, height: 400 } });
  await m.setContent(`<body style="margin:0;padding:10px;background:#333;display:grid;grid-template-columns:repeat(${colunas},640px);gap:20px;font:20px sans-serif;color:#fff">
    ${quadros.map(([t, b]) => `<figure style="margin:0"><figcaption>${t}</figcaption><img style="width:640px;background:#000" src="data:image/png;base64,${b}"></figure>`).join('')}</body>`);
  await m.screenshot({ path: resolve('docs/prints', arquivo), fullPage: true });
  await m.close();
}

const q = [];
for (let n = 1; n <= 6; n++) q.push([`MESA · ${n}`, await print('mesa', { mesaCams: n })]);
await mosaico('grade-mesa.png', q);
q.length = 0;
for (let n = 1; n <= 4; n++) q.push([`FILME · ${n}`, await print('filme', { filmeCams: n })]);
await mosaico('grade-filme.png', q, 2);
q.length = 0;
for (const [n, e] of [[1, false], [2, false], [1, true], [2, true]])
  q.push([`FUTEBOL · ${n}${e ? ' · com enquete' : ''}`, await print('futebol', { futebolCams: n, enquete: { ...enquete, mostrar: e } })]);
await mosaico('grade-futebol.png', q, 2);
q.length = 0;
for (const [t, e] of [['host', { hostCams: '1' }], ['mesa', {}], ['filme', {}], ['futebol', {}]])
  q.push([`${t.toUpperCase()} · câmeras manuais`, await print(t, { ...e, camsManuais: true })]);
await mosaico('grade-manuais.png', q, 2);
console.log('ok grade');
await browser.close();
