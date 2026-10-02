// Uso: (npm run dev rodando em :5173)  node scripts/print-lances.mjs
// ESCALAÇÃO com lances (gol, cartões, substituição, expulso, aviso) em CAMPO e LISTA, e o painel
// (botões, lista e modal do GOL). Banco simulado no navegador.
import { chromium } from 'playwright-core';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const base = resolve(process.env.HOME, '.cache/ms-playwright');
const pasta = readdirSync(base).find((d) => /^chromium-\d+$/.test(d));
const exe = resolve(base, pasta, readdirSync(resolve(base, pasta)).find((d) => d.startsWith('chrome-linux')), 'chrome');
const url = readFileSync('.env.local', 'utf8').match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const ref = new URL(url).hostname.split('.')[0];

const J = (s) => s.split(',').map((x, i) => { const [n, ...r] = x.trim().split(' '); return { numero: Number(n), nome: r.join(' '), titular: i < 11, ordem: i + 1 }; });
const times = [
  { id: 'cor', nome: 'CORINTHIANS', sigla: '', tecnico: 'Dorival Júnior', cor: null, jogadores: J('1 Hugo Souza,2 Matheuzinho,13 G. Henrique,5 A. Ramalho,46 Hugo,7 Raniele,70 J. Martínez,19 Carrillo,10 Garro,94 Memphis,9 Yuri Alberto,11 Romero') },
  { id: 'pal', nome: 'PALMEIRAS', sigla: '', tecnico: 'Abel Ferreira', cor: null, jogadores: J('21 Weverton,4 Giay,15 G. Gómez,26 Murilo,22 Piquerez,5 A. Moreno,8 Andreas,23 Veiga,17 F. Torres,9 Vitor Roque,18 Maurício') },
];
const agora = Date.now();
const lances = [
  { id: 'a', lado: 'casa', tipo: 'amarelo', slot: 5, numero: 7, nome: 'Raniele', minuto: 22, em: 0 },
  { id: 'b', lado: 'visitante', tipo: 'gol', slot: 9, numero: 9, nome: 'Vitor Roque', minuto: 31, em: 0 },
  { id: 'c', lado: 'casa', tipo: 'amarelo', slot: 5, numero: 7, nome: 'Raniele', minuto: 48, em: 0 },
  { id: 'd', lado: 'casa', tipo: 'sub', slot: 9, numero: 94, nome: 'Memphis', entra: { numero: 11, nome: 'Romero' }, minuto: 60, em: 0 },
  { id: 'e', lado: 'visitante', tipo: 'amarelo', slot: 1, numero: 4, nome: 'Giay', minuto: 63, em: 0 },
  { id: 'f', lado: 'casa', tipo: 'gol', slot: 10, numero: 9, nome: 'Yuri Alberto', minuto: 67, em: 0 },
  { id: 'g', lado: 'casa', tipo: 'gol', slot: 10, numero: 9, nome: 'Yuri Alberto', minuto: 71, em: 'AGORA' },
];
const estado = (extra) => ({
  titulo: 'OPERAÇÃO AO VIVO', ticker: 'ESCALAÇÃO CONFIRMADA ● MANDA O PIX PELO QR CODE', nomes: ['CAIO', 'LIPE', 'DUDA', 'TETÊ', 'GUI', 'NANDO'], galera: [],
  timeA: 'CORINTHIANS', timeB: 'PALMEIRAS', golsA: 2, golsB: 1, jogo: '2º TEMPO', clockAcumulado: 71 * 60 + 12,
  escModo: 'campo', escTimes: 'ambos', escFormCasa: '4-2-3-1', escFormVisit: '4-3-3', escCams: 4, escLances: lances, ...extra,
});
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const exp = Math.floor(Date.now() / 1000) + 86400;
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u1', exp, role: 'authenticated' })}.x`;
const sessao = { access_token: jwt, refresh_token: 'r', token_type: 'bearer', expires_in: 86400, expires_at: exp, user: { id: 'u1', email: 't@x.com', aud: 'authenticated', role: 'authenticated' } };
const browser = await chromium.launch({ executablePath: exe });

async function abrir(caminho, est, vw = 1920, vh = 1080) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh } });
  await ctx.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [`sb-${ref}-auth-token`, JSON.stringify(sessao)]);
  await ctx.route(`${url}/**`, (route) => {
    const u = route.request().url();
    const json = (b) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
    if (u.includes('/rpc/hora_servidor')) return json(new Date().toISOString());
    if (u.includes('/rest/v1/membros_equipe')) return json({ papel: 'admin' });
    if (u.includes('/rest/v1/salas')) return json({ estado: { ...est, escLances: est.escLances.map((l) => (l.em === 'AGORA' ? { ...l, em: Date.now() } : l)) }, updated_at: new Date().toISOString(), updated_by_nome: 'Ramon', versao: 1 });
    if (u.includes('/rest/v1/times')) return json(times);
    if (u.includes('/rest/v1/apoios')) return json([]);
    if (u.includes('/auth/v1/user')) return json(sessao.user);
    return route.fulfill({ status: 404, body: '' });
  });
  const p = await ctx.newPage();
  await p.goto('http://localhost:5173' + caminho);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(1500);
  return p;
}

// o último gol fica "agora" (aviso aparece); congela as animações no meio
const campo = await abrir('/tela/escalacao', estado({}));
await campo.addStyleTag({ content: 'html,body{background:#0f0c0e!important}' });
await campo.evaluate(() => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = 1500; }));
await campo.screenshot({ path: resolve('docs/prints/escalacao-lances-campo.png') });
const lista = await abrir('/tela/escalacao', estado({ escModo: 'lista', escLances: lances.map((l) => ({ ...l, em: 0 })) }));
await lista.addStyleTag({ content: 'html,body{background:#0f0c0e!important}' });
await lista.screenshot({ path: resolve('docs/prints/escalacao-lances-lista.png') });

const painel = await abrir('/painel', estado({ escLances: lances.map((l) => ({ ...l, em: 0 })), escPosCasa: Array.from({ length: 11 }, (_, i) => ({ x: 0.1 + i * 0.07, y: 0.5 })) }), 1440, 900);
await painel.getByRole('button', { name: 'FUTEBOL' }).first().click();
await painel.waitForTimeout(500);
await painel.locator('.p-lances').scrollIntoViewIfNeeded();
await painel.screenshot({ path: resolve('docs/prints/painel-lances.png') });
await painel.getByRole('button', { name: /^GOL$/ }).click();
await painel.waitForTimeout(400);
await painel.screenshot({ path: resolve('docs/prints/painel-lance-gol.png') });
// confirmações (alerta padrão do painel)
await painel.getByRole('dialog', { name: 'GOL' }).getByRole('button', { name: /Yuri Alberto/ }).click();
await painel.waitForTimeout(1500);
await painel.screenshot({ path: resolve('docs/prints/confirmar-gol.png') });
await painel.keyboard.press('Escape');
await painel.keyboard.press('Escape');
await painel.waitForTimeout(300);
await painel.getByRole('button', { name: 'VERMELHO' }).click();
await painel.getByRole('dialog', { name: 'CARTÃO VERMELHO' }).getByRole('button', { name: /Garro/ }).click();
await painel.waitForTimeout(1500);
await painel.screenshot({ path: resolve('docs/prints/confirmar-vermelho.png') });
await painel.keyboard.press('Escape');
await painel.keyboard.press('Escape');
await painel.waitForTimeout(300);
await painel.getByRole('button', { name: /RESETAR FORMAÇÃO · CASA/ }).click().catch(() => {});
await painel.waitForTimeout(1500);
await painel.screenshot({ path: resolve('docs/prints/confirmar-resetar.png') });
console.log('ok');
await browser.close();
