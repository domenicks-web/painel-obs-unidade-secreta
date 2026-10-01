// Teste do /alerta em produção: abre a fonte num navegador sem tela, manda um superchat falso
// pela sessão do SSN (canal 3 → 4, igual à extensão) e tira print. Pausa/retoma o LivePix de verdade.
// Uso: SESSAO=... CHAVE=... node scripts/superchat-falso.mjs [superchat|sticker|membro]
// Atenção: se algum /painel estiver aberto, ele grava o apoio falso no banco.
import { chromium } from 'playwright-core';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const { SESSAO, CHAVE } = process.env;
if (!SESSAO || !CHAVE) throw new Error('defina SESSAO e CHAVE no ambiente');
const tipo = process.argv[2] ?? 'superchat';
const SITE = process.env.SITE ?? 'https://painel-obs-unidade-secreta.vercel.app';
const base = resolve(process.env.HOME, '.cache/ms-playwright');
const pasta = readdirSync(base).find((d) => /^chromium-\d+$/.test(d));
const exe = resolve(base, pasta, readdirSync(resolve(base, pasta)).find((d) => d.startsWith('chrome-linux')), 'chrome');

const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('console', (m) => m.type() === 'error' && console.log('console:', m.text()));
page.on('response', (r) => r.url().includes('/api/livepix/') && r.request().method() === 'POST' &&
  r.text().then((t) => console.log(`${new Date().toISOString().slice(11, 19)} ${r.url().split('/api/')[1]} → ${r.status()} ${t.slice(0, 120)}`)));
await page.goto(`${SITE}/alerta?sessao=${encodeURIComponent(SESSAO)}&chave=${encodeURIComponent(CHAVE)}`);
await page.waitForTimeout(3000); // WebSocket do SSN conectar

const id = `teste-claude-${Date.now()}`;
const msg = {
  superchat: { type: 'youtube', id, chatname: 'TESTE Claude', chatmessage: 'Superchat falso pra testar o alerta!', hasDonation: '$5.00' },
  sticker: { type: 'youtube', id, chatname: 'TESTE Claude', chatmessage: '', hasDonation: 'R$ 20,00', event: 'supersticker' },
  membro: { type: 'youtube', id, chatname: 'TESTE Claude', chatmessage: 'Novo membro!', event: 'sponsorship' },
}[tipo];
const ws = new WebSocket(`wss://io.socialstream.ninja/join/${encodeURIComponent(SESSAO)}/3/4`);
await new Promise((ok, erro) => ((ws.onopen = ok), (ws.onerror = erro)));
ws.send(JSON.stringify(msg));
console.log('enviado:', tipo, id);
await page.waitForTimeout(1800);
await page.screenshot({ path: resolve(import.meta.dirname, '..', `docs/prints/alerta-producao-${tipo}.png`) });
console.log(`print: docs/prints/alerta-producao-${tipo}.png`);
await page.waitForTimeout(8000); // sai da tela e retoma o LivePix
ws.close();
await browser.close();
