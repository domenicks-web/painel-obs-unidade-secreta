import { ESTADO_PADRAO, type EstadoLive } from './tipos';
import { ehFormacao } from '../escalacao/layout';

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

/**
 * Casos da referência da ESCALAÇÃO pela URL, só com fixture:
 * ?esc=modo,times,cams,formCasa,formVisit (ex.: campo,ambos,6,4-2-3-1,3-5-2). Times e placar
 * seguem a referência: só casa = BRASIL 2×0 ÍNDIA; com visitante = CORINTHIANS 1×1 PALMEIRAS.
 */
export function escalacaoDaUrl(texto: string | null): Partial<EstadoLive> {
  if (!texto) return {};
  const [modo, times, cams, fA, fB] = texto.split(',');
  const derbi = times === 'ambos' || times === 'visitante';
  return {
    escModo: modo === 'campo' ? 'campo' : 'lista',
    escTimes: times === 'ambos' || times === 'visitante' ? times : 'casa',
    escCams: Number(cams) || 4,
    ...(ehFormacao(fA) ? { escFormCasa: fA } : {}),
    ...(ehFormacao(fB) ? { escFormVisit: fB } : {}),
    timeA: derbi ? 'CORINTHIANS' : 'BRASIL',
    timeB: derbi ? 'PALMEIRAS' : 'ÍNDIA',
    golsA: derbi ? 1 : 2,
    golsB: derbi ? 1 : 0,
    nomes: ['CAIO', 'LIPE', 'DUDA', 'TETÊ', 'GUI', 'NANDO'],
    ticker: 'ESCALAÇÃO CONFIRMADA ● MANDA O PIX PELO QR CODE ● COMENTA SEU PALPITE NO CHAT ● INSCREVA-SE NA UNIDADE SECRETA',
  };
}
