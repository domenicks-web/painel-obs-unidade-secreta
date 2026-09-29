// Variáveis do servidor na Vercel. LIVEPIX_* NÃO têm prefixo VITE_: nunca vão pro navegador.
import type { Ambiente } from '../../src/servidor/livepix';

const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env;

export function ambiente(): Ambiente {
  return {
    LIVEPIX_CLIENT_ID: env.LIVEPIX_CLIENT_ID,
    LIVEPIX_CLIENT_SECRET: env.LIVEPIX_CLIENT_SECRET,
    SUPABASE_URL: env.SUPABASE_URL ?? env.VITE_SUPABASE_URL,
    SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY,
  };
}
