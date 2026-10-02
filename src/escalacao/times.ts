// Cadastro de times (tabelas times e jogadores, migration 0012).

export interface Jogador {
  numero: number;
  /** apelido de camisa */
  nome: string;
  titular: boolean;
  /** titulares: 1 = goleiro, 2–11 na ordem da formação; reservas depois */
  ordem: number;
}

export interface Time {
  id: string;
  nome: string;
  sigla: string;
  tecnico: string;
  cor: string | null;
  jogadores: Jogador[];
}

export const TITULARES = 11;
export const MAX_ELENCO = 40;

/** Elenco na ordem de exibição: titulares primeiro (na ordem deles), depois os reservas. */
export function ordenarElenco(jogadores: Jogador[]): Jogador[] {
  return [...jogadores].sort((a, b) => Number(b.titular) - Number(a.titular) || a.ordem - b.ordem);
}

export function titulares(time: Pick<Time, 'jogadores'>): Jogador[] {
  return ordenarElenco(time.jogadores).filter((j) => j.titular);
}

/** Só time com exatamente 11 titulares pode ir pra escalação. */
export const prontoParaEscalar = (time: Pick<Time, 'jogadores'>) => titulares(time).length === TITULARES;

/** Renumera a ordem (1, 2, 3…) na sequência da lista, com os titulares na frente. */
export function renumerar(jogadores: Jogador[]): Jogador[] {
  const tit = jogadores.filter((j) => j.titular);
  const res = jogadores.filter((j) => !j.titular);
  return [...tit, ...res].map((j, i) => ({ ...j, ordem: i + 1 }));
}

/**
 * COLAR ELENCO: uma linha por jogador, "numero nome" (ex.: "10 Rodrygo"). As 11 primeiras viram
 * titulares. Linha sem número na frente é ignorada (vai em `ignoradas`).
 */
export function lerElenco(texto: string): { jogadores: Jogador[]; ignoradas: string[] } {
  const jogadores: Jogador[] = [];
  const ignoradas: string[] = [];
  for (const bruta of texto.split(/\r?\n/)) {
    const linha = bruta.trim();
    if (!linha) continue;
    const m = linha.match(/^(\d{1,3})[\s.\-–—)]+(.+)$/);
    if (!m || jogadores.length >= MAX_ELENCO) {
      ignoradas.push(linha);
      continue;
    }
    jogadores.push({ numero: Number(m[1]), nome: m[2].trim().slice(0, 30), titular: jogadores.length < TITULARES, ordem: jogadores.length + 1 });
  }
  return { jogadores, ignoradas };
}

/** Normaliza o que vem do banco (ordem numérica, nada nulo). */
export function normalizarTime(bruto: {
  id: string;
  nome: string;
  sigla?: string | null;
  tecnico?: string | null;
  cor?: string | null;
  jogadores?: Partial<Jogador>[] | null;
}): Time {
  return {
    id: bruto.id,
    nome: bruto.nome,
    sigla: bruto.sigla ?? '',
    tecnico: bruto.tecnico ?? '',
    cor: bruto.cor ?? null,
    jogadores: ordenarElenco(
      (bruto.jogadores ?? []).map((j) => ({
        numero: Number(j.numero) || 0,
        nome: j.nome ?? '',
        titular: !!j.titular,
        ordem: Number(j.ordem) || 0,
      })),
    ),
  };
}

/** Nome comparável: sem espaço sobrando, maiúsculo e sem acento ("índia " = "INDIA"). */
export const chaveNome = (nome: string) =>
  nome.normalize('NFD').replace(/\p{M}/gu, '').trim().replace(/\s+/g, ' ').toUpperCase();

/** Time cadastrado com o nome digitado no placar (ou undefined). */
export function acharTime(times: Time[], nome: string): Time | undefined {
  const k = chaveNome(nome);
  return k ? times.find((t) => chaveNome(t.nome) === k) : undefined;
}
