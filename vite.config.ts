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
        const comando = (req.url ?? '').replace(/^\//, '').split('?')[0];
        const partes: Buffer[] = [];
        for await (const p of req) partes.push(p as Buffer);
        const cabecalhos = new Headers();
        for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') cabecalhos.set(k, v);
        const pedido = new Request(`http://localhost/api/livepix/${comando}`, {
          method: req.method,
          headers: cabecalhos,
          body: partes.length && req.method !== 'GET' ? Buffer.concat(partes) : undefined,
        });
        const { tratarComando } = await server.ssrLoadModule('/src/servidor/livepix.ts');
        const r: Response = await tratarComando(pedido, comando, {
          LIVEPIX_URL_PAUSAR: env.LIVEPIX_URL_PAUSAR,
          LIVEPIX_URL_RETOMAR: env.LIVEPIX_URL_RETOMAR,
          LIVEPIX_URL_PULAR: env.LIVEPIX_URL_PULAR,
          LIVEPIX_URL_REPETIR: env.LIVEPIX_URL_REPETIR,
          LIVEPIX_URL_LIMPAR: env.LIVEPIX_URL_LIMPAR,
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
