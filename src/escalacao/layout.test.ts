import { describe, expect, it } from 'vitest';
import {
  BOLA,
  CAMPO,
  FORMACOES,
  LISTA_FORMACOES,
  arrasteParaManual,
  camerasEscalacao,
  centrosNoCampo,
  colunasLista,
  linhas,
  manuaisDaFormacao,
  posicoesCalculadas,
  sanitizarPosicoes,
  type EscModo,
  type EscTimes,
} from './layout';

const MODOS: EscModo[] = ['lista', 'campo'];
const TIMES: EscTimes[] = ['casa', 'ambos', 'visitante'];

describe('formações', () => {
  it('são as 22 do select, na ordem', () => {
    expect(LISTA_FORMACOES).toEqual([
      '4-4-2', '4-3-3', '4-2-3-1', '4-1-4-1', '4-5-1', '4-4-1-1', '4-3-1-2', '4-1-2-1-2', '4-2-2-2', '4-3-2-1', '4-2-4',
      '4-1-3-2', '3-5-2', '3-4-3', '3-4-2-1', '3-4-1-2', '3-1-4-2', '3-6-1', '5-3-2', '5-4-1', '5-2-3', '5-2-1-2',
    ]);
  });

  it.each(LISTA_FORMACOES)('%s soma 10 jogadores de linha e bate com o nome', (f) => {
    const soma = FORMACOES[f].reduce((a, b) => a + b, 0);
    expect(soma).toBe(10);
    expect(FORMACOES[f].join('-')).toBe(f);
  });
});

describe('linhas()', () => {
  const elenco = Array.from({ length: 11 }, (_, i) => i + 1);

  it('goleiro sozinho e o resto na ordem do cadastro', () => {
    expect(linhas(elenco, '4-3-3')).toEqual([[1], [2, 3, 4, 5], [6, 7, 8], [9, 10, 11]]);
    expect(linhas(elenco, '4-1-2-1-2')).toEqual([[1], [2, 3, 4, 5], [6], [7, 8], [9], [10, 11]]);
    expect(linhas(elenco, '5-2-1-2')).toEqual([[1], [2, 3, 4, 5, 6], [7, 8], [9], [10, 11]]);
  });

  it.each(LISTA_FORMACOES)('%s usa os 11 uma vez só', (f) => {
    expect(linhas(elenco, f).flat()).toEqual(elenco);
  });

  it('elenco incompleto não quebra (linhas ficam vazias)', () => {
    expect(linhas([1, 2, 3], '4-4-2')).toEqual([[1], [2, 3], [], []]);
  });
});

describe('câmeras', () => {
  for (const modo of MODOS)
    for (const times of TIMES)
      for (let n = 2; n <= 6; n++)
        it(`${modo} · ${times} · ${n}: dentro do palco, fora do chat e do letreiro, 16:9, sem sobrepor`, () => {
          const cams = camerasEscalacao(modo, times, n);
          expect(cams).toHaveLength(n);
          for (const c of cams) {
            expect(c.x).toBeGreaterThanOrEqual(0);
            expect(c.y).toBeGreaterThanOrEqual(0);
            expect(c.x + c.w).toBeLessThanOrEqual(1380);
            expect(c.y + c.h + 50).toBeLessThanOrEqual(1000);
            expect(c.w * 9).toBe(c.h * 16);
          }
          for (let i = 0; i < n; i++)
            for (let j = i + 1; j < n; j++) {
              const a = cams[i], b = cams[j];
              const separadas = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h + 50 <= b.y || b.y + b.h + 50 <= a.y;
              expect(separadas).toBe(true);
            }
          if (modo === 'lista')
            for (const col of colunasLista(times))
              for (const c of cams) expect(c.x + c.w <= col.x || col.x + col.w <= c.x).toBe(true);
          if (modo === 'campo') for (const c of cams) expect(c.y).toBeGreaterThanOrEqual(CAMPO.y + CAMPO.h);
        });

  it('campo: fileira em y=690, altura até 210, centralizada', () => {
    const cams = camerasEscalacao('campo', 'casa', 4);
    expect(cams.every((c) => c.y === 690 && c.h <= 210)).toBe(true);
    const esq = cams[0].x - 60;
    const dir = 1380 - (cams[3].x + cams[3].w);
    expect(Math.abs(esq - dir)).toBeLessThanOrEqual(1);
  });

  it('quantidade fora de 2–6 fica no limite', () => {
    expect(camerasEscalacao('lista', 'casa', 9)).toHaveLength(6);
    expect(camerasEscalacao('lista', 'casa', 1)).toHaveLength(2);
  });
});

const dentroDoCampo = (p: { x: number; y: number }) =>
  p.x - BOLA / 2 >= 0 && p.x + BOLA / 2 <= CAMPO.w && p.y - BOLA / 2 >= 0 && p.y + BOLA / 2 <= CAMPO.h;

describe('bolinhas no campo', () => {
  it.each(LISTA_FORMACOES)('%s: as 11 dentro do campo, em todos os modos', (f) => {
    for (const ambos of [false, true])
      for (const lado of ['casa', 'visitante'] as const) {
        const pts = centrosNoCampo(f, null, ambos, lado);
        expect(pts).toHaveLength(11);
        expect(pts.every(dentroDoCampo)).toBe(true);
      }
  });

  it('usa a altura toda do campo: y = 30 + (i+.5)/k × 370', () => {
    const pts = posicoesCalculadas('4-4-2', false);
    // defesa (jogadores 2–5): o primeiro do cadastro (lateral direito) fica embaixo
    const ys = pts.slice(1, 5).map((p) => p.y);
    expect(ys).toEqual([30 + 3.5 / 4 * 370, 30 + 2.5 / 4 * 370, 30 + 1.5 / 4 * 370, 30 + 0.5 / 4 * 370]);
  });

  it('ziguezague só em linha de 5+: ±48 com 1 time, ±34 com 2, alas pra frente', () => {
    const um = posicoesCalculadas('3-5-2', false);
    const meio = um.slice(4, 9).map((p) => p.x);
    const base = (0.24 + 0.5 * 0.68) * CAMPO.w;
    expect(meio.map((x) => Math.round(x - base))).toEqual([48, -48, 48, -48, 48]);
    const dois = posicoesCalculadas('3-5-2', true);
    const base2 = (0.02 + (0.24 + 0.5 * 0.68) * 0.44) * CAMPO.w;
    expect(dois.slice(4, 9).map((p) => Math.round(p.x - base2))).toEqual([34, -34, 34, -34, 34]);
    // linha de 4: reta
    const defesa = um.slice(1, 4).map((p) => p.x);
    expect(new Set(defesa).size).toBe(1);
  });

  it('com 2 times cada um fica na sua metade; o visitante gira 180°', () => {
    const casa = centrosNoCampo('4-3-3', null, true, 'casa');
    const visit = centrosNoCampo('4-3-3', null, true, 'visitante');
    expect(casa.every((p) => p.x < CAMPO.w / 2)).toBe(true);
    expect(visit.every((p) => p.x > CAMPO.w / 2)).toBe(true);
    visit.forEach((p, i) => {
      expect(p.x).toBeCloseTo(CAMPO.w - casa[i].x);
      expect(p.y).toBeCloseTo(CAMPO.h - casa[i].y);
    });
    // goleiro do visitante no gol da direita
    expect(visit[0].x).toBeGreaterThan(CAMPO.w - 100);
  });

  it('só visitante ataca pra direita no campo todo, igual à casa sozinha', () => {
    expect(centrosNoCampo('5-3-2', null, false, 'visitante')).toEqual(centrosNoCampo('5-3-2', null, false, 'casa'));
  });

  it('posições manuais nos limites (e fora deles) não saem do campo', () => {
    const cantos = [
      { x: 0, y: 0 }, { x: 1, y: 1 }, { x: -5, y: 9 }, { x: 0.5, y: 0.5 }, { x: 1, y: 0 }, { x: 0, y: 1 },
      { x: 2, y: -1 }, { x: 0.99, y: 0.99 }, { x: 0.01, y: 0.01 }, { x: 0.3, y: 1.2 }, { x: -0.1, y: 0.4 },
    ];
    const manual = sanitizarPosicoes(cantos)!;
    expect(manual).not.toBeNull();
    for (const ambos of [false, true])
      for (const lado of ['casa', 'visitante'] as const)
        expect(centrosNoCampo('4-4-2', manual, ambos, lado).every(dentroDoCampo)).toBe(true);
  });

  it('arrastar e voltar dá o mesmo ponto, inclusive no visitante espelhado', () => {
    for (const ambos of [false, true])
      for (const lado of ['casa', 'visitante'] as const) {
        const manual = manuaisDaFormacao('4-2-3-1', ambos);
        const tela = centrosNoCampo('4-2-3-1', manual, ambos, lado);
        tela.forEach((p, i) => {
          const volta = arrasteParaManual(p, ambos, lado);
          expect(volta.x).toBeCloseTo(manual[i].x);
          expect(volta.y).toBeCloseTo(manual[i].y);
        });
      }
  });

  it('editor começa onde o automático estava', () => {
    for (const ambos of [false, true]) {
      const manual = manuaisDaFormacao('4-3-3', ambos);
      const auto = centrosNoCampo('4-3-3', null, ambos, 'casa');
      centrosNoCampo('4-3-3', manual, ambos, 'casa').forEach((p, i) => {
        expect(p.x).toBeCloseTo(auto[i].x);
        expect(p.y).toBeCloseTo(auto[i].y);
      });
    }
  });

  it('sanitizarPosicoes recusa lista que não tem 11 pontos válidos', () => {
    expect(sanitizarPosicoes(null)).toBeNull();
    expect(sanitizarPosicoes([{ x: 0.5, y: 0.5 }])).toBeNull();
    expect(sanitizarPosicoes(Array(11).fill({ x: 'a', y: 0 }))).toBeNull();
  });
});
