// Cadastra (uma vez) o webhook do LivePix apontando para o site, pra meta somar PIX sozinha.
// Uso: node scripts/livepix-webhook.mjs https://SEU-DOMINIO.vercel.app/api/livepix/webhook
//      node scripts/livepix-webhook.mjs --listar
// Lê LIVEPIX_CLIENT_ID e LIVEPIX_CLIENT_SECRET do ambiente ou do .env.local (nunca do código).
// O app no LivePix precisa dos escopos "webhooks" e "messages:read".
import { existsSync, readFileSync } from 'node:fs';

const doArquivo = existsSync('.env.local')
  ? Object.fromEntries(
      readFileSync('.env.local', 'utf8')
        .split('\n')
        .map((l) => l.match(/^([A-Z_]+)=(.*)$/))
        .filter(Boolean)
        .map((m) => [m[1], m[2].trim()]),
    )
  : {};
const ID = process.env.LIVEPIX_CLIENT_ID || doArquivo.LIVEPIX_CLIENT_ID;
const SEGREDO = process.env.LIVEPIX_CLIENT_SECRET || doArquivo.LIVEPIX_CLIENT_SECRET;
if (!ID || !SEGREDO) throw new Error('defina LIVEPIX_CLIENT_ID e LIVEPIX_CLIENT_SECRET (ambiente ou .env.local)');

const alvo = process.argv[2];
if (!alvo) throw new Error('uso: node scripts/livepix-webhook.mjs <url do webhook> | --listar');

const t = await fetch('https://oauth.livepix.gg/oauth2/token', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'client_credentials', client_id: ID, client_secret: SEGREDO, scope: 'webhooks' }),
});
if (!t.ok) throw new Error(`token: HTTP ${t.status} ${await t.text()}`);
const { access_token } = await t.json();
const api = (caminho, init = {}) =>
  fetch(`https://api.livepix.gg/v2${caminho}`, {
    ...init,
    headers: { authorization: `Bearer ${access_token}`, 'content-type': 'application/json', ...(init.headers || {}) },
  });

const lista = await api('/webhooks?limit=100');
if (!lista.ok) throw new Error(`listar: HTTP ${lista.status} ${await lista.text()}`);
const { data: existentes = [] } = await lista.json();
console.log('webhooks cadastrados:', existentes.length ? existentes.map((w) => `${w.id} → ${w.url}`).join('\n  ') : 'nenhum');
if (alvo === '--listar') process.exit(0);

if (!/^https:\/\/.+\/api\/livepix\/webhook$/.test(alvo)) throw new Error('a URL precisa ser https://…/api/livepix/webhook');
if (existentes.some((w) => w.url === alvo)) {
  console.log('já estava cadastrado, nada a fazer');
} else {
  const r = await api('/webhooks', { method: 'POST', body: JSON.stringify({ url: alvo }) });
  if (!r.ok) throw new Error(`cadastrar: HTTP ${r.status} ${await r.text()}`);
  console.log('cadastrado:', (await r.json()).data?.id, '→', alvo);
}
