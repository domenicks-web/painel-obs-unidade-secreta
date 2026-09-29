import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { TELAS } from './live/tipos';

const MARCA = 'Unidade Secreta';

/** Título da aba por página (dá pra achar a aba certa com várias abertas). */
export function tituloDaPagina(caminho: string): string {
  const tela = caminho.match(/^\/tela\/([^/]+)/);
  if (tela) {
    const t = TELAS.find((x) => x.id === tela[1]);
    return `${t ? t.label : 'Tela'} · ${MARCA}`;
  }
  if (caminho.startsWith('/chat')) return `Chat ao vivo · ${MARCA}`;
  if (caminho.startsWith('/login')) return `Entrar · ${MARCA}`;
  if (caminho.startsWith('/admin')) return `Galera e acessos · ${MARCA}`;
  return `● Painel da Live · ${MARCA}`;
}

export function useTituloDaPagina() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = tituloDaPagina(pathname);
  }, [pathname]);
}
