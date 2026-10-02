// Lances do jogo na ESCALAÇÃO: gol, cartão e substituição. Ficam no estado (escLances), na ordem em
// que aconteceram. slot = posição do titular (0 = goleiro … 10), a mesma da bolinha no campo; a
// substituição troca quem ocupa o slot. Gol e cartão valem pra pessoa (número + nome) que estava no
// slot naquela hora. slot -1 = jogador sem cadastro (só aparece no aviso e na lista do painel).

export type TipoLance = 'gol' | 'amarelo' | 'vermelho' | 'sub';
export type LadoLance = 'casa' | 'visitante';

export interface Pessoa {
  numero: number;
  nome: string;
}

export interface Lance extends Pessoa {
  id: string;
  lado: LadoLance;
  tipo: TipoLance;
  slot: number;
  /** substituição: quem entrou (numero/nome do lance = quem saiu) */
  entra?: Pessoa;
  /** minuto do jogo pelo relógio (67 = 67'); null sem relógio */
  minuto: number | null;
  /** hora do servidor (ms) em que foi registrado: o aviso só aparece pra lance recente */
  em: number;
}

export const MAX_LANCES = 80;
export const AVISO_MS = 8000;

export interface Ocupante extends Pessoa {
  slot: number;
  gols: number;
  amarelos: number;
  vermelho: boolean;
  /** vermelho direto ou segundo amarelo */
  expulso: boolean;
  /** entrou no lugar de alguém */
  entrou: boolean;
  /** id do último lance dessa pessoa (pra pulsar a bolinha) */
  ultimo: string | null;
}

const mesma = (a: Pessoa, b: Pessoa) => a.numero === b.numero && a.nome === b.nome;

/** Minuto do jogo como se fala: 0:30 → 1', 66:10 → 67'. */
export const minutoDoJogo = (segundos: number) => Math.floor(Math.max(0, segundos) / 60) + 1;

/** Quem está em cada slot agora, com os lances de cada um. */
export function ocupantes(titulares: Pessoa[], lances: Lance[], lado: LadoLance): Ocupante[] {
  const atual: Ocupante[] = titulares.map((p, slot) => ({
    numero: p.numero,
    nome: p.nome,
    slot,
    gols: 0,
    amarelos: 0,
    vermelho: false,
    expulso: false,
    entrou: false,
    ultimo: null,
  }));
  for (const l of lances) {
    if (l.lado !== lado) continue;
    const o = atual[l.slot];
    if (!o) continue;
    if (l.tipo === 'sub') {
      if (!l.entra || !mesma(o, l)) continue; // saiu quem não estava em campo: ignora
      atual[l.slot] = { ...l.entra, slot: l.slot, gols: 0, amarelos: 0, vermelho: false, expulso: false, entrou: true, ultimo: l.id };
      continue;
    }
    if (!mesma(o, l)) continue;
    if (l.tipo === 'gol') o.gols++;
    if (l.tipo === 'amarelo') o.amarelos++;
    if (l.tipo === 'vermelho') o.vermelho = true;
    o.expulso = o.vermelho || o.amarelos >= 2;
    o.ultimo = l.id;
  }
  return atual;
}

/** Lista vinda do estado: só o que é lance válido. */
export function sanitizarLances(bruto: unknown): Lance[] {
  if (!Array.isArray(bruto)) return [];
  const tipos: TipoLance[] = ['gol', 'amarelo', 'vermelho', 'sub'];
  const out: Lance[] = [];
  for (const b of bruto) {
    if (!b || typeof b !== 'object') continue;
    const l = b as Record<string, unknown>;
    if (typeof l.id !== 'string' || (l.lado !== 'casa' && l.lado !== 'visitante') || !tipos.includes(l.tipo as TipoLance)) continue;
    const entra = l.entra as Record<string, unknown> | undefined;
    if (l.tipo === 'sub' && (!entra || typeof entra.nome !== 'string')) continue;
    out.push({
      id: l.id,
      lado: l.lado,
      tipo: l.tipo as TipoLance,
      slot: Number.isInteger(l.slot) ? (l.slot as number) : -1,
      numero: Number(l.numero) || 0,
      nome: String(l.nome ?? ''),
      ...(l.tipo === 'sub' && entra ? { entra: { numero: Number(entra.numero) || 0, nome: String(entra.nome) } } : {}),
      minuto: Number.isFinite(Number(l.minuto)) && l.minuto !== null ? Number(l.minuto) : null,
      em: Number(l.em) || 0,
    });
  }
  return out.slice(-MAX_LANCES);
}

const ROTULO: Record<TipoLance, string> = { gol: 'GOL', amarelo: 'AMARELO', vermelho: 'VERMELHO', sub: 'SUBSTITUIÇÃO' };

/** Texto do lance: "67' GOL · VINI JR." / "60' SAI RODRYGO, ENTRA ENDRICK". */
export function textoLance(l: Lance): string {
  const min = l.minuto != null ? `${l.minuto}' ` : '';
  if (l.tipo === 'sub') return `${min}SAI ${l.nome.toUpperCase()}, ENTRA ${l.entra?.nome.toUpperCase() ?? ''}`;
  return `${min}${ROTULO[l.tipo]} · ${l.nome.toUpperCase()}`;
}

/** Lance mais novo se ainda está dentro da janela do aviso (hora do servidor). */
export function lanceRecente(lances: Lance[], agoraServidor: number): Lance | null {
  const l = lances.at(-1);
  return l && agoraServidor - l.em >= 0 && agoraServidor - l.em < AVISO_MS ? l : null;
}

/** "9 Endrick" / "9 - Endrick" → pessoa; null se não tem número na frente. */
export function lerPessoa(texto: string): Pessoa | null {
  const m = texto.trim().match(/^(\d{1,3})[\s.\-–—)]+(.+)$/);
  return m ? { numero: Number(m[1]), nome: m[2].trim().slice(0, 30) } : null;
}
