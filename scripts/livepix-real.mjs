// Testa os 4 controles do LivePix contra o LivePix e o Supabase de verdade (com npm run dev em :5173).
// Uso: EMAIL=... SENHA=... node scripts/livepix-real.mjs
// Rodar FORA DA LIVE e com a fila vazia: pausar, pular, repetir e limpar agem na fila real.
// Abre dois painéis logados (A clica, B só olha) pra conferir que os dois veem o mesmo estado.
// Termina sempre tocando (RETOMAR se precisar), pra não deixar os alertas pausados.
import { chromium } from 'playwright-core';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const { EMAIL, SENHA } = process.env;
if (!EMAIL || !SENHA) throw new Error('defina EMAIL e SENHA no ambiente');
const BASE = 'http://localhost:5173';
const base = resolve(process.env.HOME, '.cache/ms-playwright');
const pasta = readdirSync(base).find((d) => /^chromium-\d+$/.test(d));
const exe = resolve(base, pasta, readdirSync(resolve(base, pasta)).find((d) => d.startsWith('chrome-linux')), 'chrome');

let falhas = 0;
function registrar(nome, ok, detalhe = '') {
  if (!ok) falhas++;
  console.log(`${ok ? 'OK  ' : 'FALHOU'} ${nome}${detalhe ? ' — ' + detalhe : ''}`);
}

async function abrirPainel(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/login`);
  await p.locator('input[type="email"]').fill(EMAIL);
  await p.locator('input[type="password"]').fill(SENHA);
  await p.locator('button[type="submit"]').click();
  await p.waitForURL(/\/painel/, { timeout: 15000 });
  await p.locator('.p-livepix__botao').first().waitFor({ timeout: 15000 });
  return p;
}

const selo = (p) => p.locator('.p-status', { hasText: 'LIVEPIX' });
const textoSelo = async (p) => ((await selo(p).locator('.p-status__extra').textContent().catch(() => '')) ?? '').trim();

async function esperarSelo(p, esperado, ms = 5000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if ((await textoSelo(p)) === esperado) return Date.now() - t0;
    await p.waitForTimeout(100);
  }
  return null;
}

// clica e devolve o status HTTP da chamada /api/livepix/<comando>
async function clicar(p, rotulo, comando, antes) {
  const resposta = p.waitForResponse((r) => r.url().endsWith(`/api/livepix/${comando}`), { timeout: 15000 });
  if (antes) await antes();
  else await p.getByRole('button', { name: rotulo, exact: true }).click();
  const r = await resposta;
  return r.status();
}

const browser = await chromium.launch({ executablePath: exe });
const a = await abrirPainel(browser);
const b = await abrirPainel(browser);
registrar('login nos dois painéis', true);

// garante o ponto de partida: tocando
if ((await a.locator('.p-livepix__botao', { hasText: 'RETOMAR' }).count()) > 0) {
  await clicar(a, 'RETOMAR', 'retomar');
}

const passos = [
  { rotulo: 'PAUSAR ALERTAS', comando: 'pausar', selo: 'PAUSADO' },
  { rotulo: 'PULAR', comando: 'pular', selo: 'PAUSADO · PULOU' },
  { rotulo: 'RETOMAR', comando: 'retomar', selo: 'RETOMADO' },
  { rotulo: 'REPETIR', comando: 'repetir', selo: 'REPETIU' },
  {
    rotulo: 'LIMPAR FILA',
    comando: 'limpar',
    selo: 'FILA LIMPA',
    antes: async () => {
      await a.getByRole('button', { name: 'LIMPAR FILA', exact: true }).click();
      const pergunta = await a.getByRole('alertdialog', { name: 'Limpar fila?' }).isVisible();
      registrar('LIMPAR FILA pergunta "Limpar fila?" antes', pergunta);
      await a.getByRole('button', { name: 'LIMPAR', exact: true }).click();
    },
  },
];

try {
for (const passo of passos) {
  const status = await clicar(a, passo.rotulo, passo.comando, passo.antes);
  registrar(`${passo.rotulo}: LivePix aceitou`, status === 200, `HTTP ${status}`);
  const msA = await esperarSelo(a, passo.selo);
  const msB = await esperarSelo(b, passo.selo);
  registrar(`${passo.rotulo}: selo "${passo.selo}" nos dois painéis`, msA !== null && msB !== null, `A ${msA} ms · B ${msB} ms`);
  if (passo.comando === 'pausar') {
    await a.screenshot({ path: 'docs/prints/painel-livepix-pausado.png' });
    const faixaB = await b.getByText('ALERTAS PAUSADOS · FILA SEGURANDO').isVisible();
    registrar('pausado: o outro painel também mostra a faixa e RETOMAR', faixaB && (await b.getByRole('button', { name: 'RETOMAR' }).isVisible()));
  }
  if (passo.comando === 'limpar') {
    await a.locator('.p-livepix').screenshot({ path: 'docs/prints/painel-livepix-grade.png' });
  }
}

// grade 2x2
const caixas = await a.locator('.p-livepix__botao').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => [Math.round(r.x), Math.round(r.y)]));
const xs = new Set(caixas.map((c) => c[0])).size;
const ys = new Set(caixas.map((c) => c[1])).size;
registrar('4 botões em grade 2×2', caixas.length === 4 && xs === 2 && ys === 2, JSON.stringify(caixas));

const dica = await selo(a).getAttribute('title');
registrar('dica do selo diz quem e quando', /^Último comando: FILA LIMPA, por .+, /.test(dica ?? ''), dica ?? '');

// recarregar mantém o último comando (vem do banco)
await b.reload();
await b.locator('.p-livepix__botao').first().waitFor();
registrar('recarregar mantém o estado', (await esperarSelo(b, 'FILA LIMPA')) !== null);

await a.screenshot({ path: 'docs/prints/painel-livepix-ativo.png' });
} finally {
  // nunca deixa os alertas pausados, mesmo se algo falhou no meio
  const pausado = await a.getByRole('button', { name: 'RETOMAR', exact: true }).count().catch(() => 0);
  if (pausado) await clicar(a, 'RETOMAR', 'retomar').catch(() => {});
  await browser.close();
}
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO OK');
process.exit(falhas ? 1 : 0);
