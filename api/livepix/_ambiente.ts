// Variáveis do servidor na Vercel. LIVEPIX_*, SUPABASE_SERVICE_ROLE_KEY e ALERTA_CHAVE NÃO têm prefixo VITE_:
// nunca vão pro navegador.
import type { AmbienteApoios } from '../../src/servidor/apoios.js';

const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env;

export function ambiente(): AmbienteApoios {
  return {
    LIVEPIX_URL_PAUSAR: env.LIVEPIX_URL_PAUSAR,
    LIVEPIX_URL_RETOMAR: env.LIVEPIX_URL_RETOMAR,
    LIVEPIX_URL_PULAR: env.LIVEPIX_URL_PULAR,
    LIVEPIX_URL_REPETIR: env.LIVEPIX_URL_REPETIR,
    LIVEPIX_URL_LIMPAR: env.LIVEPIX_URL_LIMPAR,
    SUPABASE_URL: env.SUPABASE_URL ?? env.VITE_SUPABASE_URL,
    SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY,
    LIVEPIX_CLIENT_ID: env.LIVEPIX_CLIENT_ID,
    LIVEPIX_CLIENT_SECRET: env.LIVEPIX_CLIENT_SECRET,
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
    ALERTA_CHAVE: env.ALERTA_CHAVE,
  };
}
