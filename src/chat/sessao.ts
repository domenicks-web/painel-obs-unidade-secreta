// O ID da sessão do Social Stream Ninja dá acesso à extensão: não vai para o estado da live
// (público) nem para o código. Overlay: vem na URL do OBS. Painel: digitado uma vez por navegador.
const CHAVE = 'us-chat-sessao';

/** Em dev, o ID do .env.local (VITE_SSN_SESSAO). No build de produção é sempre vazio. */
export function sessaoPadraoDev(): string {
  return import.meta.env.DEV ? (import.meta.env.VITE_SSN_SESSAO ?? '') : '';
}

export function lerSessao(): string {
  try {
    return localStorage.getItem(CHAVE) || sessaoPadraoDev();
  } catch {
    return sessaoPadraoDev();
  }
}

export function gravarSessao(sessao: string) {
  try {
    if (sessao) localStorage.setItem(CHAVE, sessao);
    else localStorage.removeItem(CHAVE);
  } catch {
    // sem localStorage: vale só enquanto a página estiver aberta
  }
}
