import { createClient } from '@supabase/supabase-js';
import { fetchComSaida } from './fetchSaida';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar definidos (veja .env.example)');
}

// "Lembrar neste PC" desligado guarda a sessão só na aba (sessionStorage): fechou o navegador, sai.
export const CHAVE_LEMBRAR = 'us:lembrar';
const lembrar = () => localStorage.getItem(CHAVE_LEMBRAR) !== '0';

export const supabase = createClient(url, anonKey, {
  global: { fetch: fetchComSaida },
  auth: {
    storage: {
      getItem: (k) => localStorage.getItem(k) ?? sessionStorage.getItem(k),
      setItem: (k, v) => (lembrar() ? localStorage : sessionStorage).setItem(k, v),
      removeItem: (k) => {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
      },
    },
  },
});
