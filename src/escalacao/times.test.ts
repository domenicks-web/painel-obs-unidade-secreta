import { describe, expect, it } from 'vitest';
import { lerElenco, normalizarTime, ordenarElenco, prontoParaEscalar, renumerar, titulares, type Jogador } from './times';

const j = (numero: number, titular: boolean, ordem: number): Jogador => ({ numero, nome: `J${numero}`, titular, ordem });

describe('times', () => {
  it('exige exatamente 11 titulares', () => {
    const onze = Array.from({ length: 11 }, (_, i) => j(i + 1, true, i + 1));
    expect(prontoParaEscalar({ jogadores: onze })).toBe(true);
    expect(prontoParaEscalar({ jogadores: onze.slice(0, 9) })).toBe(false);
    expect(prontoParaEscalar({ jogadores: [...onze, j(12, true, 12)] })).toBe(false);
    expect(prontoParaEscalar({ jogadores: [...onze, j(12, false, 12)] })).toBe(true);
    expect(prontoParaEscalar({ jogadores: [] })).toBe(false);
  });

  it('titulares vêm na ordem do cadastro, goleiro primeiro', () => {
    const elenco = [j(9, true, 3), j(1, true, 1), j(20, false, 2), j(4, true, 2)];
    expect(titulares({ jogadores: elenco }).map((x) => x.numero)).toEqual([1, 4, 9]);
    expect(ordenarElenco(elenco).map((x) => x.numero)).toEqual([1, 4, 9, 20]);
  });

  it('renumerar põe titulares na frente e numera 1..n', () => {
    const r = renumerar([j(20, false, 1), j(1, true, 5), j(4, true, 9)]);
    expect(r.map((x) => [x.numero, x.ordem])).toEqual([[1, 1], [4, 2], [20, 3]]);
  });

  it('COLAR ELENCO: "numero nome", 11 primeiros titulares', () => {
    const texto = Array.from({ length: 13 }, (_, i) => `${i + 1} Jogador ${i + 1}`).join('\n') + '\n\nsem numero\n 99 - Vini Jr. ';
    const { jogadores, ignoradas } = lerElenco(texto);
    expect(jogadores).toHaveLength(14);
    expect(jogadores.filter((x) => x.titular)).toHaveLength(11);
    expect(jogadores[11].titular).toBe(false);
    expect(jogadores[13]).toEqual({ numero: 99, nome: 'Vini Jr.', titular: false, ordem: 14 });
    expect(ignoradas).toEqual(['sem numero']);
  });

  it('normalizarTime aguenta campos nulos e numeric em texto', () => {
    const t = normalizarTime({ id: 'a', nome: 'X', sigla: null, tecnico: null, jogadores: [{ numero: '7' as unknown as number, nome: 'A', titular: true, ordem: 1 }] });
    expect(t).toEqual({ id: 'a', nome: 'X', sigla: '', tecnico: '', cor: null, jogadores: [{ numero: 7, nome: 'A', titular: true, ordem: 1 }] });
  });
});
