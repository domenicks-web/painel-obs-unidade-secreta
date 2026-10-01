// Molduras de câmera por tela. A câmera de verdade é encaixada no OBS por cima da moldura; o site
// só desenha a moldura e a etiqueta do nome. Sem layout salvo, a tela usa o automático (grade.ts e
// os layouts aprovados do HOST); qualquer edição no painel grava a lista inteira daquela tela.
// X/Y é o canto INFERIOR ESQUERDO: mudar o tamanho cresce pra cima e pra direita, e a etiqueta
// (presa embaixo) não sai do lugar.
import type { EstadoLive, PatchLive } from '../live/tipos';
import { AREA_FILME, AREA_FUTEBOL, AREA_FUTEBOL_ENQUETE, AREA_MESA, gradeCameras, type Caixa } from './grade';

export type FormatoCam = '16:9' | '4:3' | '1:1' | '9:16' | 'livre';
export const FORMATOS: FormatoCam[] = ['16:9', '4:3', '1:1', '9:16', 'livre'];
const PROPORCAO: Record<Exclude<FormatoCam, 'livre'>, number> = { '16:9': 16 / 9, '4:3': 4 / 3, '1:1': 1, '9:16': 9 / 16 };

export interface Camera {
  id: string;
  nome: string;
  formato: FormatoCam;
  w: number;
  h: number;
  x: number; // canto inferior esquerdo, no palco de 1920×1080
  y: number;
  /** lado da etiqueta do nome embaixo da moldura (padrão: esquerda, ícone e depois nome) */
  etiqueta?: 'direita';
}

export type TelaCam = 'host' | 'mesa' | 'filme' | 'futebol' | 'jogo' | 'react';
export const TELAS_CAM: TelaCam[] = ['host', 'mesa', 'filme', 'futebol', 'jogo', 'react'];
export const ehTelaCam = (t: string): t is TelaCam => (TELAS_CAM as string[]).includes(t);
export const CHAVE_CAMS = { host: 'camsHost', mesa: 'camsMesa', filme: 'camsFilme', futebol: 'camsFutebol', jogo: 'camsJogo', react: 'camsReact' } as const;
// botões de ponto de partida (layout automático com N câmeras)
export const PARTIDAS: Record<TelaCam, number[]> = { host: [1, 2, 3], mesa: [1, 2, 3, 4, 5, 6], filme: [1, 2, 3, 4], futebol: [1, 2], jogo: [1, 2], react: [1, 2] };
export const MAX_CAMERAS = 12;

const MIN = 40;
const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(v)));

// layouts do HOST desenhados à mão (topo-esquerda, como na referência)
const HOST: Record<number, Caixa[]> = {
  1: [{ x: 60, y: 150, w: 928, h: 522 }],
  2: [{ x: 60, y: 240, w: 640, h: 360 }, { x: 740, y: 240, w: 640, h: 360 }],
  3: [{ x: 60, y: 150, w: 896, h: 504 }, { x: 980, y: 150, w: 400, h: 225 }, { x: 980, y: 429, w: 400, h: 225 }],
};

// JOGO: moldura da gameplay na tela inteira (sem etiqueta) + a câmera no canto de baixo à direita.
// REACT: câmeras nos cantos de cima. Coordenadas já no canto inferior esquerdo.
const CAM_JOGO = { w: 480, h: 270, x: 1400, y: 1010 };
const CANTOS_REACT = [
  { w: 480, h: 270, x: 40, y: 310 },
  { w: 480, h: 270, x: 1400, y: 310 },
];

export function layoutAutomatico(tela: TelaCam, n: number, estado: EstadoLive): Camera[] {
  const nome = (i: number) => estado.nomes[i] || `NOME 0${i + 1}`;
  if (tela === 'jogo') {
    const cam: Camera = { id: 'auto-cam', nome: nome(0), formato: '16:9', ...CAM_JOGO };
    return n >= 2 ? [{ id: 'auto-gameplay', nome: '', formato: '16:9', w: 1920, h: 1080, x: 0, y: 1080 }, cam] : [cam];
  }
  if (tela === 'react')
    return CANTOS_REACT.slice(0, Math.max(1, Math.min(2, n))).map((c, i) => ({ id: `auto-${i + 1}`, nome: nome(i), formato: '16:9', ...c }));
  const caixas =
    tela === 'host'
      ? HOST[n] ?? HOST[1]
      : gradeCameras(
          n,
          tela === 'mesa' ? AREA_MESA : tela === 'filme' ? AREA_FILME : estado.enquete.mostrar ? AREA_FUTEBOL_ENQUETE : AREA_FUTEBOL,
        );
  return caixas.map((c, i) => ({
    id: `auto-${i + 1}`,
    nome: nome(i),
    formato: '16:9',
    w: c.w,
    h: c.h,
    x: c.x,
    y: c.y + c.h,
  }));
}

const QTD_PADRAO: Record<Exclude<TelaCam, 'host'>, number> = { mesa: 6, filme: 4, futebol: 2, jogo: 2, react: 2 };

export function camerasDaTela(estado: EstadoLive, tela: TelaCam): Camera[] {
  const salvo = sanitizar((estado as unknown as Record<string, unknown>)[CHAVE_CAMS[tela]]);
  if (salvo) return salvo;
  return layoutAutomatico(tela, tela === 'host' ? Number(estado.hostCams) || 1 : QTD_PADRAO[tela], estado);
}

/** Lista vinda do banco: descarta o que não é câmera e põe tudo dentro dos limites. null = não é lista. */
export function sanitizar(bruto: unknown): Camera[] | null {
  if (!Array.isArray(bruto)) return null;
  const lista: Camera[] = [];
  for (const b of bruto) {
    if (!b || typeof b !== 'object') continue;
    const c = b as Record<string, unknown>;
    if (typeof c.id !== 'string' || ![c.w, c.h, c.x, c.y].every((v) => Number.isFinite(Number(v)))) continue;
    const formato = FORMATOS.includes(c.formato as FormatoCam) ? (c.formato as FormatoCam) : 'livre';
    const base: Camera = { id: c.id, nome: typeof c.nome === 'string' ? c.nome : '', formato, w: 0, h: 0, x: 0, y: 0 };
    if (c.etiqueta === 'direita') base.etiqueta = 'direita';
    lista.push({ ...mudarTamanho(base, { w: Number(c.w), h: formato === 'livre' ? Number(c.h) : undefined }), ...posicao(Number(c.x), Number(c.y)) });
    if (lista.length === MAX_CAMERAS) break;
  }
  return lista;
}

const posicao = (x: number, y: number) => ({ x: limitar(x, 0, 1920 - MIN), y: limitar(y, MIN, 1080) });

/** Muda largura e/ou altura. Formato travado: quem mudou manda e o outro acompanha. */
export function mudarTamanho(c: Camera, novo: { w?: number; h?: number }): Camera {
  if (c.formato === 'livre')
    return { ...c, w: limitar(novo.w ?? c.w, MIN, 1920), h: limitar(novo.h ?? c.h, MIN, 1080) };
  const r = PROPORCAO[c.formato];
  // a largura máxima também respeita a altura máxima (9:16 não passa de 1080 de altura)
  const wMax = Math.min(1920, 1080 * r);
  const w = novo.w != null ? novo.w : (novo.h ?? c.h) * r;
  const wFinal = Math.min(wMax, Math.max(MIN, w));
  return { ...c, w: Math.round(wFinal), h: Math.round(wFinal / r) };
}

export function mudarFormato(c: Camera, formato: FormatoCam): Camera {
  return mudarTamanho({ ...c, formato }, { w: c.w });
}

export function mudarPosicao(c: Camera, x: number, y: number): Camera {
  return { ...c, ...posicao(x, y) };
}

export function novaCamera(lista: Camera[]): Camera {
  const passo = (lista.length % 6) * 40;
  return {
    id: Math.random().toString(36).slice(2, 10),
    nome: '',
    formato: '16:9',
    w: 640,
    h: 360,
    x: 640 + passo,
    y: 720 - passo,
  };
}

/** delta +1 = um pra frente (mais pro fim da lista, desenhado por cima); -1 = um pra trás. */
export function moverOrdem(lista: Camera[], i: number, delta: 1 | -1): Camera[] {
  const j = i + delta;
  if (j < 0 || j >= lista.length) return lista;
  const nova = [...lista];
  [nova[i], nova[j]] = [nova[j], nova[i]];
  return nova;
}

/** Patch que grava a lista de uma tela (cada tela tem a sua chave no estado). */
export function patchCams(tela: TelaCam, lista: Camera[]): PatchLive {
  switch (tela) {
    case 'host':
      return { camsHost: lista };
    case 'mesa':
      return { camsMesa: lista };
    case 'filme':
      return { camsFilme: lista };
    case 'futebol':
      return { camsFutebol: lista };
    case 'jogo':
      return { camsJogo: lista };
    case 'react':
      return { camsReact: lista };
  }
}
