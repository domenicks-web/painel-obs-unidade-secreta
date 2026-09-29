import { ESTADO_PADRAO, type EstadoLive } from './tipos';

// Mesmos dados que a referência usa por padrão, pra comparação visual lado a lado.
export const ESTADO_REFERENCIA: EstadoLive = {
  ...ESTADO_PADRAO,
  golsA: 1,
  golsB: 0,
  clockAcumulado: 67 * 60,
  jogo: '2º TEMPO',
  metaAtual: 320,
  pixNome: 'FULANO',
  pixValor: 10,
  topNome: 'CICRANO',
  topValor: 50,
  enquete: { casa: 54, empate: 18, fora: 28, mostrar: true },
};
