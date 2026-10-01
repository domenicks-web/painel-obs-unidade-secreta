import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { TELAS } from './live/tipos';

const MARCA = 'Unidade Secreta';
const com = (pagina: string) => `${pagina} | ${MARCA}`;

// "MESA REDONDA" → "Mesa Redonda", "FILME/SÉRIE" → "Filme/Série"
const normal = (rotulo: string) => rotulo.toLowerCase().replace(/(^|[\s/])(\p{L})/gu, (_, antes, letra) => antes + letra.toUpperCase());

/** Título da aba por página (dá pra achar a aba certa com várias abertas). */
export function tituloDaPagina(caminho: string): string {
  const tela = caminho.match(/^\/tela\/([^/]+)/);
  if (tela) {
    const t = TELAS.find((x) => x.id === tela[1]);
    return t ? com(normal(t.label)) : MARCA;
  }
  if (caminho.startsWith('/chat')) return com('Chat');
  if (caminho.startsWith('/alerta')) return com('Alertas');
  if (caminho.startsWith('/login')) return com('Entrar');
  if (caminho.startsWith('/admin')) return com('Equipe');
  return com('Painel');
}

export function useTituloDaPagina() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = tituloDaPagina(pathname);
  }, [pathname]);
}
