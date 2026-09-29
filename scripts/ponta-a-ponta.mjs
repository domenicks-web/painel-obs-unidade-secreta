// Teste de ponta a ponta contra o Supabase de verdade (com npm run dev em :5173).
// Uso: EMAIL=... SENHA=... node scripts/ponta-a-ponta.mjs
// A senha vem só do ambiente, nunca de arquivo. PIX de teste usam nomes "TESTE ..." e ficam
// marcados como "não contar" no fim; título, relógio e contagem voltam ao que eram.
import { chromium } from 'playwright-core';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const { EMAIL, SENHA } = process.env;
if (!EMAIL || !SENHA) throw new Error('defina EMAIL e SENHA no ambiente');
const BASE = 'http://localhost:5173';
const base = resolve(process.env.HOME, '.cache/ms-playwright');
const pasta = readdirSync(base).find((d) => /^chromium-\d+$/.test(d));
const exe = resolve(base, pasta, readdirSync(resolve(base, pasta)).find((d) => d.startsWith('chrome-linux')), 'chrome');

const resultados = [];
function registrar(nome, ok, detalhe = '') {
  resultados.push({ nome, ok, detalhe });
  console.log(`${ok ? 'OK  ' : 'FALHOU'} ${nome}${detalhe ? ' — ' + detalhe : ''}`);
}
async function esperarTexto(page, seletor, cond, ms = 5000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const txt = await page.locator(seletor).first().textContent().catch(() => null);
    if (txt != null && cond(txt.trim())) return { txt: txt.trim(), ms: Date.now() - t0 };
    await page.waitForTimeout(100);
  }
  const txt = await page.locator(seletor).first().textContent().catch(() => null);
  return { txt: txt?.trim() ?? null, ms: null };
}

const browser = await chromium.launch({ executablePath: exe });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const painel = await ctx.newPage();
const erros = [];
painel.on('pageerror', (e) => erros.push(e.message));

// login
await painel.goto(`${BASE}/login`);
await painel.locator('input[type="email"]').fill(EMAIL);
await painel.locator('input[type="password"]').fill(SENHA);
await painel.getByRole('button', { name: /ENTRAR NO QG/ }).click();
await painel.waitForURL('**/painel', { timeout: 15000 });
await painel.getByText('TELAS SINCRONIZADAS').waitFor();
registrar('login e painel carregam', true);

const campoTitulo = painel.getByLabel('TÍTULO DA LIVE · TODAS AS CENAS');
await painel.waitForTimeout(1500);
// se uma rodada anterior parou no meio, o título ficou "TESTE ..."; TITULO_ORIGINAL força o valor de volta
const lido = await campoTitulo.inputValue();
const tituloOriginal = process.env.TITULO_ORIGINAL || (lido.startsWith('TESTE') ? 'OPERAÇÃO AO VIVO' : lido);
let minutosAntes = null;
let relogioMexido = false;

try {

const host = await ctx.newPage();
await host.goto(`${BASE}/tela/host`);
const alerta = await ctx.newPage();
await alerta.goto(`${BASE}/alerta`);
await host.waitForTimeout(2500);

// 1. título chega na tela
const novoTitulo = `TESTE ${Date.now() % 10000}`;
await campoTitulo.fill(novoTitulo);
const t1 = await esperarTexto(host, '.t-topo__titulo', (t) => t === novoTitulo);
registrar('título do painel aparece na /tela/host', t1.ms != null, t1.ms != null ? `${t1.ms} ms depois de digitar (inclui os 400 ms de espera)` : `tela mostra "${t1.txt}"`);

// 2. PIX manual: meta, último e alerta
const metaAntes = (await host.locator('.t-host__meta-atual').textContent()).trim();
const nomePix = `TESTE PIX ${Date.now() % 1000}`;
await painel.getByPlaceholder('NOME (PIX MANUAL)').fill(nomePix);
await painel.getByPlaceholder('R$').fill('7,50');
await painel.getByText('+ ADD').click();
const ult = await esperarTexto(host, '.t-host__card--ultimo .t-host__card-nome', (t) => t === nomePix);
registrar('PIX manual vira "último PIX" no Host', ult.ms != null, ult.ms != null ? `${ult.ms} ms` : `mostra "${ult.txt}"`);
const metaDepois = (await host.locator('.t-host__meta-atual').textContent()).trim();
registrar('meta soma R$ 7,50', metaDepois !== metaAntes, `${metaAntes} → ${metaDepois}`);
const al = await esperarTexto(alerta, '.a-alerta__nome', (t) => t === nomePix, 4000);
registrar('/alerta mostra o cartão do PIX', al.ms != null, al.ms != null ? `${al.ms} ms` : `mostra "${al.txt}"`);

// 3. não contar → meta volta
const linhaPix = painel.locator('.p-pix__item', { hasText: nomePix });
await linhaPix.getByTitle('Não contar (estorno/teste)').click();
const volta = await esperarTexto(host, '.t-host__meta-atual', (t) => t === metaAntes);
registrar('"não contar" tira o PIX da meta', volta.ms != null, `meta ${volta.txt} (antes ${metaAntes})`);

// 4. relógio do futebol pela hora do servidor
await painel.locator('body').click({ position: { x: 5, y: 890 } });
await painel.keyboard.press('3');
await painel.getByText('RELÓGIO', { exact: true }).waitFor();
// relógio que ficou rodando de uma rodada anterior: zera antes de testar
if (await painel.getByText('❚❚ PAUSAR').count()) await painel.getByText('❚❚ PAUSAR').click();
await painel.getByText('ZERAR').click();
await painel.getByText('▶ INICIAR').waitFor();
await painel.waitForTimeout(800);
await painel.getByText('▶ INICIAR').click();
relogioMexido = true;
await painel.waitForTimeout(2500);
const futebolA = await ctx.newPage();
await futebolA.goto(`${BASE}/tela/futebol`);
await futebolA.waitForTimeout(2000);
const relPainel = (await painel.locator('.p-relogio__tempo').textContent()).trim();
const relTela = (await futebolA.locator('.t-futebol__relogio').textContent()).trim();
const seg = Number(relPainel.split(':')[0]) * 60 + Number(relPainel.split(':')[1]);
registrar('relógio roda pela hora do servidor', seg >= 3 && relTela === `${Math.floor(seg / 60)}'`, `painel ${relPainel}, tela aberta depois ${relTela}`);
await painel.getByText('❚❚ PAUSAR').click();
await painel.getByText('ZERAR').click();
relogioMexido = false;

// 5. contagem: duas fontes abertas em momentos diferentes mostram o mesmo tempo
await painel.keyboard.press('1');
minutosAntes = (await painel.locator('.p-opcao--min.p-opcao--ativa').textContent()).trim();
await painel.getByText('2 MIN', { exact: true }).click();
await painel.waitForTimeout(1500);
const inicio = await ctx.newPage();
await inicio.goto(`${BASE}/tela/inicio`);
await inicio.waitForTimeout(3000);
const intervalo = await ctx.newPage();
await intervalo.goto(`${BASE}/tela/intervalo`);
await intervalo.waitForTimeout(2000);
const [ti, tv] = await Promise.all([
  inicio.locator('.t-inicio__relogio').textContent(),
  intervalo.locator('.t-intervalo__relogio').textContent(),
]);
const s = (x) => Number(x.split(':')[0]) * 60 + Number(x.split(':')[1]);
registrar('Início e Intervalo mostram o mesmo tempo', Math.abs(s(ti) - s(tv)) <= 1 && s(ti) < 120, `início ${ti}, intervalo ${tv}`);

registrar('sem erros de JavaScript no painel', erros.length === 0, erros.join(' | '));
} catch (e) {
  registrar('passo interrompido', false, e.message.split('\n')[0]);
} finally {
  // arrumar o que o teste mexeu, mesmo se algum passo falhou
  if (relogioMexido) {
    await painel.keyboard.press('3');
    if (await painel.getByText('❚❚ PAUSAR').count()) await painel.getByText('❚❚ PAUSAR').click();
    await painel.getByText('ZERAR').click();
  }
  if (minutosAntes) {
    await painel.keyboard.press('1');
    await painel.getByText(minutosAntes, { exact: true }).click();
  }
  await campoTitulo.fill(tituloOriginal);
  await painel.waitForTimeout(1500);
  console.log(`(título restaurado para "${tituloOriginal}")`);
}

await browser.close();
const falhas = resultados.filter((r) => !r.ok).length;
console.log(falhas ? `\n${falhas} falha(s)` : '\nTUDO OK');
process.exit(falhas ? 1 : 0);
