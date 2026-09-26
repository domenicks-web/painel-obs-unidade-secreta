export interface Membro {
  n: string;
  f: string;
}

export interface Estado {
  titulo: string;
  minutos: number;
  fim: number;
  msg: string;
  proximo: string;
  timeA: string;
  timeB: string;
  golsA: number;
  golsB: number;
  jogo: string;
  membros: Membro[];
  noAr: number[];
  cams: string[];
  lt: number;
  ltAte: number;
  ltSeg: number;
}

export type Cena = 'comecando' | 'intervalo' | 'encerramento' | 'jogo' | 'react' | 'nome' | 'alerta';

export interface EventoAlerta {
  nome: string;
  mensagem: string;
}

export const ESTADO_PADRAO: Estado = {
  titulo: 'RESENHA AO VIVO',
  minutos: 5,
  fim: 0,
  msg: 'VOLTAMOS JÁ',
  proximo: 'SEXTA, 21H',
  timeA: 'CASA',
  timeB: 'FORA',
  golsA: 0,
  golsB: 0,
  jogo: 'AO VIVO',
  membros: Array.from({ length: 10 }, (_, i) => ({
    n: `NOME ${String(i + 1).padStart(2, '0')}`,
    f: 'UNIDADE SECRETA',
  })),
  noAr: [0, 1, 2],
  cams: ['NOME 01', 'NOME 02', 'NOME 03'],
  lt: -1,
  ltAte: 0,
  ltSeg: 6,
};
