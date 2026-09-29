/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Em dev, atende /api/livepix/* com o mesmo código das funções da Vercel (api/livepix/*),
// lendo LIVEPIX_* do .env.local no lado do servidor.
function apiLivePixDev(): Plugin {
  return {
    name: 'api-livepix-dev',
    apply: 'serve',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '');
      server.middlewares.use('/api/livepix', async (req, res) => {
        const acao = (req.url ?? '').replace(/^\//, '').split('?')[0];
        if (acao !== 'controls' && acao !== 'skip' && acao !== 'replay') {
          res.statusCode = 404;
          return res.end();
        }
        const partes: Buffer[] = [];
        for await (const p of req) partes.push(p as Buffer);
        const cabecalhos = new Headers();
        for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') cabecalhos.set(k, v);
        const pedido = new Request(`http://localhost/api/livepix/${acao}`, {
          method: req.method,
          headers: cabecalhos,
          body: partes.length && req.method !== 'GET' ? Buffer.concat(partes) : undefined,
        });
        const { tratarControles } = await server.ssrLoadModule('/src/servidor/livepix.ts');
        const r: Response = await tratarControles(pedido, acao, {
          LIVEPIX_CLIENT_ID: env.LIVEPIX_CLIENT_ID,
          LIVEPIX_CLIENT_SECRET: env.LIVEPIX_CLIENT_SECRET,
          SUPABASE_URL: env.VITE_SUPABASE_URL,
          SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY,
        });
        res.statusCode = r.status;
        r.headers.forEach((v, k) => res.setHeader(k, v));
        res.end(Buffer.from(await r.arrayBuffer()));
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
