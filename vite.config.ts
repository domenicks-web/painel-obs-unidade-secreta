/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Em dev, atende /api/livepix/* e /api/cambio com o mesmo código das funções da Vercel (api/*),
// lendo as variáveis do servidor do .env.local.
function apiLivePixDev(): Plugin {
  return {
    name: 'api-livepix-dev',
    apply: 'serve',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '');
      const amb = {
        LIVEPIX_URL_PAUSAR: env.LIVEPIX_URL_PAUSAR,
        LIVEPIX_URL_RETOMAR: env.LIVEPIX_URL_RETOMAR,
        LIVEPIX_URL_PULAR: env.LIVEPIX_URL_PULAR,
        LIVEPIX_URL_REPETIR: env.LIVEPIX_URL_REPETIR,
        LIVEPIX_URL_LIMPAR: env.LIVEPIX_URL_LIMPAR,
        SUPABASE_URL: env.VITE_SUPABASE_URL,
        SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY,
        LIVEPIX_CLIENT_ID: env.LIVEPIX_CLIENT_ID,
        LIVEPIX_CLIENT_SECRET: env.LIVEPIX_CLIENT_SECRET,
        SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
        ALERTA_CHAVE: env.ALERTA_CHAVE,
      };
      async function pedido(req: import('node:http').IncomingMessage, url: string) {
        const partes: Buffer[] = [];
        for await (const p of req) partes.push(p as Buffer);
        const cabecalhos = new Headers();
        for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') cabecalhos.set(k, v);
        return new Request(url, {
          method: req.method,
          headers: cabecalhos,
          body: partes.length && req.method !== 'GET' ? Buffer.concat(partes) : undefined,
        });
      }
      async function responder(res: import('node:http').ServerResponse, r: Response) {
        res.statusCode = r.status;
        r.headers.forEach((v, k) => res.setHeader(k, v));
        res.end(Buffer.from(await r.arrayBuffer()));
      }
      server.middlewares.use('/api/livepix', async (req, res) => {
        const comando = (req.url ?? '').replace(/^\//, '').split('?')[0];
        const r = await pedido(req, `http://localhost/api/livepix/${comando}`);
        const apoios = await server.ssrLoadModule('/src/servidor/apoios.ts');
        if (comando === 'webhook') return responder(res, await apoios.tratarWebhookLivePix(r, amb));
        if (comando === 'alerta') return responder(res, await apoios.tratarAlertaLivePix(r, amb));
        const { tratarComando } = await server.ssrLoadModule('/src/servidor/livepix.ts');
        return responder(res, await tratarComando(r, comando, amb));
      });
      server.middlewares.use('/api/cambio', async (req, res) => {
        const { tratarCambio } = await server.ssrLoadModule('/src/servidor/apoios.ts');
        return responder(res, await tratarCambio(await pedido(req, 'http://localhost/api/cambio')));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), apiLivePixDev()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
    passWithNoTests: true,
  },
});
