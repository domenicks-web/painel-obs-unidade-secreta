export const TELAS = [
  { id: 'inicio', label: 'INÍCIO' },
  { id: 'host', label: 'HOST' },
  { id: 'futebol', label: 'FUTEBOL' },
  { id: 'filme', label: 'FILME/SÉRIE' },
  { id: 'mesa', label: 'MESA REDONDA' },
  { id: 'intervalo', label: 'INTERVALO' },
  { id: 'lower', label: 'LOWER THIRD' },
  { id: 'tecnico', label: 'TÉCNICO' },
  { id: 'fim', label: 'FIM' },
] as const;

export type TelaId = (typeof TELAS)[number]['id'];

export const JOGO_OPCOES = ['1º TEMPO', 'INTERVALO', '2º TEMPO', 'PRORROGAÇÃO', 'OUTRO'] as const;
export type Jogo = (typeof JOGO_OPCOES)[number];

export interface Pessoa {
  id: string;
  nome: string;
  funcao: string;
}

export interface Enquete {
  casa: number;
  empate: number;
  fora: number;
  mostrar: boolean;
}

export interface ChatPin {
  autor: string;
  txt: string;
  plataforma: string;
}

export interface EstadoLive {
  titulo: string;
  ticker: string;
  nomes: string[];
  galera: Pessoa[];
  minutos: number;
  timerInicio: number | null;
  msg: string;
  hostCams: '1' | '2' | '3';
  pixLink: string;
  metaDesc: string;
  metaTotal: number;
  ajuste: number;
  metaAtual: number;
  pixNome: string;
  pixValor: number;
  topNome: string;
  topValor: number;
  timeA: string;
  timeB: string;
  golsA: number;
  golsB: number;
  jogo: Jogo;
  jogoOutro: string;
  clockInicio: number | null;
  clockAcumulado: number;
  clockRodando: boolean;
  enquete: Enquete;
  filme: string;
  episodio: string;
  ltNome: string;
  funcao: string;
  proximo: string;
  chatPin: ChatPin | null;
}

export type CampoSoDoBanco =
  | 'metaAtual' | 'pixNome' | 'pixValor' | 'topNome' | 'topValor'
  | 'timerInicio' | 'clockInicio' | 'clockAcumulado' | 'clockRodando';

export type PatchLive = Partial<Omit<EstadoLive, CampoSoDoBanco>>;

export const ESTADO_PADRAO: EstadoLive = {
  titulo: 'OPERAÇÃO AO VIVO',
  ticker: 'SE INSCREVE NO CANAL ● ATIVA O SININHO ● MANDA O PIX NA DESCRIÇÃO ● A UNIDADE NÃO PARA',
  nomes: ['NOME 01', 'NOME 02', 'NOME 03', 'NOME 04', 'NOME 05', 'NOME 06'],
  galera: [],
  minutos: 5,
  timerInicio: null,
  msg: 'VOLTAMOS JÁ',
  hostCams: '1',
  pixLink: 'LIVEPIX.GG/UNIDADESECRETA',
  metaDesc: 'PIZZA PRA RAPAZIADA',
  metaTotal: 500,
  ajuste: 0,
  metaAtual: 0,
  pixNome: '—',
  pixValor: 0,
  topNome: '—',
  topValor: 0,
  timeA: 'CASA',
  timeB: 'FORA',
  golsA: 0,
  golsB: 0,
  jogo: '1º TEMPO',
  jogoOutro: '',
  clockInicio: null,
  clockAcumulado: 0,
  clockRodando: false,
  enquete: { casa: 0, empate: 0, fora: 0, mostrar: false },
  filme: 'NOME DO FILME',
  episodio: 'T1 · E3',
  ltNome: 'NOME 01',
  funcao: 'UNIDADE SECRETA',
  proximo: 'SEXTA, 21H',
  chatPin: null,
};

export interface Pix {
  id: string;
  nome: string;
  valor: number;
  msg: string;
  origem: 'manual' | 'livepix';
  externo_id: string | null;
  off: boolean;
  created_at: string;
}

// numeric pode chegar como string no Realtime
export function normalizarPix(linha: Pix): Pix {
  return { ...linha, valor: Number(linha.valor) };
}
