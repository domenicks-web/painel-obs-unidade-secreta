// Variáveis do servidor na Vercel. LIVEPIX_* NÃO têm prefixo VITE_: nunca vão pro navegador.
import type { Ambiente } from '../../src/servidor/livepix';

const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env;

export function ambiente(): Ambiente {
  return {
    LIVEPIX_URL_PAUSAR: env.LIVEPIX_URL_PAUSAR,
    LIVEPIX_URL_RETOMAR: env.LIVEPIX_URL_RETOMAR,
    LIVEPIX_URL_PULAR: env.LIVEPIX_URL_PULAR,
    LIVEPIX_URL_REPETIR: env.LIVEPIX_URL_REPETIR,
    LIVEPIX_URL_LIMPAR: env.LIVEPIX_URL_LIMPAR,
    SUPABASE_URL: env.SUPABASE_URL ?? env.VITE_SUPABASE_URL,
    SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY,
  };
}
