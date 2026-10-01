import type { Camera } from '../telas/cameras';
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
  // molduras de câmera editadas no painel, por tela (src/telas/cameras.ts); null = layout automático
  camsHost: Camera[] | null;
  camsMesa: Camera[] | null;
  camsFilme: Camera[] | null;
  camsFutebol: Camera[] | null;
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

// Chaves com ponto mudam só um pedaço (uma câmera, um campo da enquete); o banco aplica com
// jsonb_set, então dois editores mexendo em pedaços diferentes não se atropelam.
export type CaminhoLive = { [K in `nomes.${number}`]?: string } & {
  'enquete.casa'?: number;
  'enquete.empate'?: number;
  'enquete.fora'?: number;
  'enquete.mostrar'?: boolean;
};

export type PatchLive = Partial<Omit<EstadoLive, CampoSoDoBanco>> & CaminhoLive;

// Aplica um patch (com ou sem caminhos) sobre o estado, sem mutar nada.
export function aplicarPatch(estado: EstadoLive, patch: PatchLive): EstadoLive {
  const novo = { ...estado } as EstadoLive & Record<string, unknown>;
  for (const [k, v] of Object.entries(patch)) {
    const ponto = k.indexOf('.');
    if (ponto < 0) {
      novo[k] = v;
      continue;
    }
    const raiz = k.slice(0, ponto);
    const sub = k.slice(ponto + 1);
    if (raiz === 'nomes') {
      const nomes = [...novo.nomes];
      nomes[Number(sub)] = v as string;
      novo.nomes = nomes;
    } else if (raiz === 'enquete') {
      novo.enquete = { ...novo.enquete, [sub]: v };
    }
  }
  return novo;
}

export const ESTADO_PADRAO: EstadoLive = {
  titulo: 'OPERAÇÃO AO VIVO',
  ticker: 'SE INSCREVE NO CANAL ● ATIVA O SININHO ● MANDA O PIX NA DESCRIÇÃO ● A UNIDADE NÃO PARA',
  nomes: ['NOME 01', 'NOME 02', 'NOME 03', 'NOME 04', 'NOME 05', 'NOME 06'],
  galera: [],
  minutos: 5,
  timerInicio: null,
  msg: 'VOLTAMOS JÁ',
  hostCams: '1',
  camsHost: null,
  camsMesa: null,
  camsFilme: null,
  camsFutebol: null,
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

export type TipoApoio = 'pix' | 'superchat' | 'sticker' | 'membro';

/** Linha da tabela apoios: PIX (manual ou LivePix), superchat, super sticker e membro do YouTube. */
export interface Apoio {
  id: string;
  nome: string;
  /** sempre em reais */
  valor: number;
  msg: string;
  origem: 'manual' | 'livepix' | 'youtube';
  tipo: TipoApoio;
  /** como veio da plataforma ("US$ 10.00"); vazio no PIX */
  valor_texto: string;
  externo_id: string | null;
  off: boolean;
  created_at: string;
}

// numeric pode chegar como string no Realtime
export function normalizarApoio(linha: Apoio): Apoio {
  return { ...linha, valor: Number(linha.valor), tipo: linha.tipo ?? 'pix', valor_texto: linha.valor_texto ?? '' };
}

