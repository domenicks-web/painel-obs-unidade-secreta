// Lógica da tela ESCALAÇÃO, portada de referencia/Tela Escalacao.dc.html (FORMACOES, linhas(),
// camsLista(), camsCampo(), tokens()). Tudo em pixels do palco de 1920×1080; o campo tem o próprio
// sistema (0,0 no canto de cima à esquerda do gramado, 1320×430).
import type { Caixa } from '../telas/grade';

export const FORMACOES = {
  '4-4-2': [4, 4, 2], '4-3-3': [4, 3, 3], '4-2-3-1': [4, 2, 3, 1], '4-1-4-1': [4, 1, 4, 1], '4-5-1': [4, 5, 1],
  '4-4-1-1': [4, 4, 1, 1], '4-3-1-2': [4, 3, 1, 2], '4-1-2-1-2': [4, 1, 2, 1, 2], '4-2-2-2': [4, 2, 2, 2],
  '4-3-2-1': [4, 3, 2, 1], '4-2-4': [4, 2, 4], '4-1-3-2': [4, 1, 3, 2], '3-5-2': [3, 5, 2], '3-4-3': [3, 4, 3],
  '3-4-2-1': [3, 4, 2, 1], '3-4-1-2': [3, 4, 1, 2], '3-1-4-2': [3, 1, 4, 2], '3-6-1': [3, 6, 1], '5-3-2': [5, 3, 2],
  '5-4-1': [5, 4, 1], '5-2-3': [5, 2, 3], '5-2-1-2': [5, 2, 1, 2],
} as const satisfies Record<string, readonly number[]>;

export type Formacao = keyof typeof FORMACOES;
export const LISTA_FORMACOES = Object.keys(FORMACOES) as Formacao[];
export const ROTULO_FORMACAO: Partial<Record<Formacao, string>> = { '4-1-2-1-2': '4-1-2-1-2 (LOSANGO)' };
export const ehFormacao = (f: unknown): f is Formacao => typeof f === 'string' && Object.hasOwn(FORMACOES, f);
export const formacaoOu = (f: unknown, padrao: Formacao): Formacao => (ehFormacao(f) ? f : padrao);

export const COR_CASA = '#FF6B1F';
export const COR_VISITANTE = '#8B6CF0';

export type EscModo = 'lista' | 'campo';
export type EscTimes = 'casa' | 'ambos' | 'visitante';

/** Goleiro numa linha só, depois os 10 de linha repartidos pela formação (na ordem do cadastro). */
export function linhas<T>(elenco: T[], f: Formacao): T[][] {
  const out: T[][] = [elenco.slice(0, 1)];
  let i = 1;
  for (const c of FORMACOES[f]) {
    out.push(elenco.slice(i, i + c));
    i += c;
  }
  return out;
}

// ---- câmeras -------------------------------------------------------------------------------
// Mesma distribuição da referência, mas as caixas ficam sempre 16:9 (regra das câmeras do
// projeto), com largura múltipla de 16 como no resto das telas.

const caber169 = (wMax: number, hMax: number) => {
  const w = Math.floor(Math.min(wMax, (hMax * 16) / 9) / 16) * 16;
  return { w, h: (w / 16) * 9 };
};

/** Câmeras do modo LISTA: no meio, entre as colunas dos times (caixas com x/y no canto de cima). */
export function camsLista(n: number, x0: number, W: number): Caixa[] {
  const cols = n <= 2 ? 1 : W > 800 && n > 4 ? 3 : 2;
  const rows = Math.ceil(n / cols);
  const gx = 36, gy = 64, label = 50, y0 = 190, H = 780;
  const { w, h } = caber169(Math.floor((W - (cols - 1) * gx) / cols), Math.floor((H - label - (rows - 1) * gy) / rows));
  const top = y0 + Math.floor((H - (rows * h + (rows - 1) * gy + label)) / 2);
  const out: Caixa[] = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols), c = i % cols, naLinha = Math.min(cols, n - r * cols);
    const larguraLinha = naLinha * w + (naLinha - 1) * gx;
    out.push({ w, h, x: x0 + Math.floor((W - larguraLinha) / 2) + c * (w + gx), y: top + r * (h + gy) });
  }
  return out;
}

/** Câmeras do modo CAMPO: uma fileira embaixo do campo (y=690, altura até 210), centralizada. */
export function camsCampo(n: number): Caixa[] {
  const gap = 24, W = 1320;
  const { w, h } = caber169(Math.floor((W - (n - 1) * gap) / n), 210);
  const x0 = 60 + Math.floor((W - (n * w + (n - 1) * gap)) / 2);
  return Array.from({ length: n }, (_, i) => ({ w, h, x: x0 + i * (w + gap), y: 690 }));
}

export const COLUNA_LISTA = { y: 190, h: 780 };

export function camerasEscalacao(modo: EscModo, times: EscTimes, n: number): Caixa[] {
  const q = Math.max(2, Math.min(6, Math.round(n) || 4));
  if (modo === 'campo') return camsCampo(q);
  return times === 'ambos' ? camsLista(q, 426, 588) : camsLista(q, 476, 904);
}

/** Colunas do modo LISTA: 1 time à esquerda; 2 times, uma de cada lado. */
export function colunasLista(times: EscTimes): { lado: 'casa' | 'visitante'; x: number; w: number }[] {
  if (times === 'ambos') return [{ lado: 'casa', x: 60, w: 330 }, { lado: 'visitante', x: 1050, w: 330 }];
  return [{ lado: times, x: 60, w: 380 }];
}

// ---- campo ---------------------------------------------------------------------------------

export const CAMPO = { x: 60, y: 222, w: 1320, h: 430 };
export const BOLA = 46; // diâmetro da bolinha
const ETIQUETA = 31; // 4 de espaço + 27 da etiqueta do nome, embaixo da bolinha

export interface Ponto {
  x: number;
  y: number;
}

/**
 * Centro de cada um dos 11 titulares (na ordem do cadastro) no campo, em px, atacando pra direita.
 * ambos: o time ocupa só a metade da esquerda. Linhas com 5+ jogadores fazem ziguezague, com as
 * alas pra frente (e o resto alternando a partir delas), pra nenhum nome cair embaixo da bolinha
 * seguinte.
 */
export function posicoesCalculadas(f: Formacao, ambos: boolean): Ponto[] {
  const ls = linhas(Array.from({ length: 11 }, (_, i) => i), f);
  const nL = ls.length - 1;
  const out: Ponto[] = [];
  ls.forEach((linha, li) => {
    let x = li === 0 ? 0.05 : 0.24 + (nL === 1 ? 0 : (li - 1) / (nL - 1)) * 0.68;
    if (ambos) x = 0.02 + x * 0.44;
    const k = linha.length;
    const zig = k >= 5 ? (ambos ? 34 : 48) : 0;
    linha.forEach((jogador, idx) => {
      // defesa da direita pra esquerda: atacando pra direita, a direita do time é embaixo
      const i = k - 1 - idx;
      const y = 30 + ((i + 0.5) / k) * (CAMPO.h - 60);
      const dx = zig ? (Math.min(i, k - 1 - i) % 2 === 0 ? zig : -zig) : 0;
      out[jogador] = { x: x * CAMPO.w + dx, y };
    });
  });
  return out;
}

// Posições manuais: 0–1 no campo inteiro, sempre de quem ataca pra direita. Com os dois times, cada
// um ocupa a sua metade (o mesmo encolhimento do automático) e o visitante gira 180°.
const LIM = {
  x0: BOLA / 2 / CAMPO.w,
  x1: 1 - BOLA / 2 / CAMPO.w,
  y0: BOLA / 2 / CAMPO.h,
  y1: (CAMPO.h - BOLA / 2 - ETIQUETA) / CAMPO.h,
};
const entre = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const limitarPosicao = (p: Ponto): Ponto => ({ x: entre(p.x, LIM.x0, LIM.x1), y: entre(p.y, LIM.y0, LIM.y1) });

/** Lista vinda do estado: 11 pontos válidos (já dentro do campo) ou null. */
export function sanitizarPosicoes(bruto: unknown): Ponto[] | null {
  if (!Array.isArray(bruto) || bruto.length !== 11) return null;
  const out: Ponto[] = [];
  for (const p of bruto) {
    const x = Number(p?.x), y = Number(p?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    out.push(limitarPosicao({ x, y }));
  }
  return out;
}

/** Ponto manual (0–1) → px no campo, do ponto de vista de quem ataca pra direita. */
export function manualParaPx(p: Ponto, ambos: boolean): Ponto {
  const x = ambos ? 0.02 + p.x * 0.44 : p.x;
  return { x: x * CAMPO.w, y: p.y * CAMPO.h };
}

export function pxParaManual(p: Ponto, ambos: boolean): Ponto {
  const x = p.x / CAMPO.w;
  return limitarPosicao({ x: ambos ? (x - 0.02) / 0.44 : x, y: p.y / CAMPO.h });
}

/** Visitante com os dois times em campo: ataca pra esquerda (giro de 180°). */
export const girar = (p: Ponto): Ponto => ({ x: CAMPO.w - p.x, y: CAMPO.h - p.y });

/**
 * Centros finais (px no campo) do time. lado = de onde ele joga na tela: com os dois times o
 * visitante gira; sozinho (casa ou visitante) ele ataca pra direita no campo todo.
 */
export function centrosNoCampo(f: Formacao, manual: Ponto[] | null, ambos: boolean, lado: 'casa' | 'visitante'): Ponto[] {
  const base = manual ? manual.map((p) => manualParaPx(p, ambos)) : posicoesCalculadas(f, ambos);
  return ambos && lado === 'visitante' ? base.map(girar) : base;
}

/** Ponto arrastado na tela (px no campo) → posição manual do time (0–1, atacando pra direita). */
export function arrasteParaManual(p: Ponto, ambos: boolean, lado: 'casa' | 'visitante'): Ponto {
  return pxParaManual(ambos && lado === 'visitante' ? girar(p) : p, ambos);
}

/** Posições manuais de partida, a partir das calculadas (o editor começa de onde a tela está). */
export function manuaisDaFormacao(f: Formacao, ambos: boolean): Ponto[] {
  return posicoesCalculadas(f, ambos).map((p) => pxParaManual(p, ambos));
}

/** Largura máxima da etiqueta do nome no campo. */
export const larguraNome = (ambos: boolean) => (ambos ? 112 : 150);
