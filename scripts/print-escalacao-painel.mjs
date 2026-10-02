// Uso: (npm run dev rodando em :5173)  node scripts/print-escalacao-painel.mjs
// Painel na tela ESCALAÇÃO (lista, campo com editor de posições), cadastro de TIMES e celular,
// com sessão e banco simulados no navegador (nada vai pro Supabase de verdade).
import { chromium } from 'playwright-core';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const base = resolve(process.env.HOME, '.cache/ms-playwright');
const pasta = readdirSync(base).find((d) => /^chromium-\d+$/.test(d));
const exe = resolve(base, pasta, readdirSync(resolve(base, pasta)).find((d) => d.startsWith('chrome-linux')), 'chrome');
const url = readFileSync('.env.local', 'utf8').match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const ref = new URL(url).hostname.split('.')[0];

const J = (s) => s.split(',').map((x, i) => { const [n, ...r] = x.trim().split(' '); return { numero: Number(n), nome: r.join(' '), titular: true, ordem: i + 1 }; });
const times = [
  { id: 'brasil', nome: 'BRASIL', sigla: 'BRA', tecnico: 'Carlo Ancelotti', cor: null, jogadores: J('1 Alisson,2 Vanderson,4 Marquinhos,3 Gabriel,6 Alex Sandro,5 Casemiro,8 Bruno G.,20 Paquetá,7 Raphinha,10 Rodrygo,11 Vini Jr.') },
  { id: 'corinthians', nome: 'CORINTHIANS', sigla: 'COR', tecnico: 'Dorival Júnior', cor: null, jogadores: J('1 Hugo Souza,2 Matheuzinho,13 G. Henrique,5 A. Ramalho,46 Hugo,7 Raniele,70 J. Martínez,19 Carrillo,10 Garro,94 Memphis,9 Yuri Alberto') },
  { id: 'india', nome: 'ÍNDIA', sigla: 'IND', tecnico: 'A DEFINIR', cor: null, jogadores: J('1 JOGADOR 1,2 JOGADOR 2,3 JOGADOR 3,4 JOGADOR 4,5 JOGADOR 5,6 JOGADOR 6,7 JOGADOR 7,8 JOGADOR 8,9 JOGADOR 9').concat([{ numero: 12, nome: 'RESERVA', titular: false, ordem: 10 }]) },
  { id: 'palmeiras', nome: 'PALMEIRAS', sigla: 'PAL', tecnico: 'Abel Ferreira', cor: null, jogadores: J('21 Weverton,4 Giay,15 G. Gómez,26 Murilo,22 Piquerez,5 A. Moreno,8 Andreas,23 Veiga,17 F. Torres,9 Vitor Roque,18 Maurício') },
];
const estadoBase = {
  titulo: 'OPERAÇÃO AO VIVO', ticker: 'ESCALAÇÃO CONFIRMADA ● MANDA O PIX PELO QR CODE',
  nomes: ['CAIO', 'LIPE', 'DUDA', 'TETÊ', 'GUI', 'NANDO'], galera: [],
  timeA: 'CORINTHIANS', timeB: 'FLAMENGO', golsA: 1, golsB: 1, jogo: '2º TEMPO', clockAcumulado: 4020,
  escModo: 'lista', escTimes: 'ambos', escFormCasa: '4-2-3-1', escFormVisit: '4-3-3', escCams: 4,
};
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const exp = Math.floor(Date.now() / 1000) + 86400;
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u1', exp, role: 'authenticated' })}.x`;
const sessao = { access_token: jwt, refresh_token: 'r', token_type: 'bearer', expires_in: 86400, expires_at: exp, user: { id: 'u1', email: 'teste@x.com', aud: 'authenticated', role: 'authenticated' } };
const browser = await chromium.launch({ executablePath: exe });

async function abrir(estado, largura = 1440, altura = 900) {
  const ctx = await browser.newContext({ viewport: { width: largura, height: altura } });
  await ctx.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [`sb-${ref}-auth-token`, JSON.stringify(sessao)]);
  await ctx.route(`${url}/**`, (route) => {
    const u = route.request().url();
    const json = (b) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
    if (u.includes('/rpc/hora_servidor')) return json(new Date().toISOString());
    if (u.includes('/rest/v1/membros_equipe')) return json({ papel: 'admin' });
    if (u.includes('/rest/v1/salas')) return json({ estado, updated_at: new Date().toISOString(), updated_by_nome: 'Ramon' });
    if (u.includes('/rest/v1/times')) return json(times);
    if (u.includes('/rest/v1/apoios')) return json([]);
    if (u.includes('/auth/v1/user')) return json(sessao.user);
    return route.fulfill({ status: 404, body: '' });
  });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173/painel');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'FUTEBOL' }).first().click();
  await page.waitForTimeout(500);
  await page.getByRole('group', { name: 'CENA DA PRÉVIA' }).getByRole('button', { name: 'ESCALAÇÃO' }).click();
  await page.waitForTimeout(800);
  return page;
}

const lista = await abrir(estadoBase);
await lista.screenshot({ path: resolve('docs/prints/painel-escalacao-lista.png'), fullPage: true });
await lista.getByRole('button', { name: 'CONFIGURAR ESCALAÇÃO' }).click();
await lista.waitForTimeout(400);
await lista.screenshot({ path: resolve('docs/prints/painel-escalacao-modal.png') });
await lista.keyboard.press('Escape');
await lista.getByRole('button', { name: 'AJUSTAR MOLDURAS' }).click();
await lista.waitForTimeout(400);
await lista.screenshot({ path: resolve('docs/prints/painel-molduras-modal.png') });
await lista.keyboard.press('Escape');
await lista.locator('.p-esc-resumo').scrollIntoViewIfNeeded();
await lista.waitForTimeout(300);
await lista.screenshot({ path: resolve('docs/prints/painel-futebol-campos.png') });
await lista.getByRole('button', { name: 'TIMES', exact: true }).click();
await lista.getByRole('button', { name: /ÍNDIA/ }).click();
await lista.waitForTimeout(400);
await lista.screenshot({ path: resolve('docs/prints/painel-times.png') });


const campo = await abrir({ ...estadoBase, escModo: 'campo', escCams: 6 });
await campo.getByRole('button', { name: 'EDITAR POSIÇÕES' }).click();
await campo.waitForTimeout(400);
await campo.screenshot({ path: resolve('docs/prints/painel-escalacao-campo.png'), fullPage: true });

const cel = await abrir(estadoBase, 390, 844);
const largura = await cel.evaluate(() => document.documentElement.scrollWidth);
await cel.screenshot({ path: resolve('docs/prints/painel-escalacao-celular.png'), fullPage: true });
await cel.getByRole('button', { name: 'TIMES', exact: true }).click();
await cel.getByRole('button', { name: /BRASIL/ }).click();
await cel.waitForTimeout(400);
const largura2 = await cel.evaluate(() => document.documentElement.scrollWidth);
await cel.screenshot({ path: resolve('docs/prints/painel-times-celular.png') });
console.log('ok; largura no celular =', largura, largura2);
await browser.close();
