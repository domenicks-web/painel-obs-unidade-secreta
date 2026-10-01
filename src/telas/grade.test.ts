import { describe, expect, it } from 'vitest';
import { gradeCameras, AREA_FILME, AREA_FUTEBOL, AREA_FUTEBOL_ENQUETE, AREA_MESA } from './grade';

const pos = (g: ReturnType<typeof gradeCameras>) => g.map((c) => [c.x, c.y, c.w, c.h]);

describe('gradeCameras', () => {
  it('com a quantidade de sempre, reproduz as posições aprovadas', () => {
    expect(pos(gradeCameras(6, AREA_MESA))).toEqual([
      [62, 160, 576, 324], [672, 160, 576, 324], [1282, 160, 576, 324],
      [62, 570, 576, 324], [672, 570, 576, 324], [1282, 570, 576, 324],
    ]);
    expect(pos(gradeCameras(4, AREA_FILME))).toEqual([
      [60, 130, 624, 351], [756, 130, 624, 351],
      [60, 550, 624, 351], [756, 550, 624, 351],
    ]);
    expect(pos(gradeCameras(2, AREA_FUTEBOL))).toEqual([[60, 370, 640, 360], [740, 370, 640, 360]]);
    expect(pos(gradeCameras(2, AREA_FUTEBOL_ENQUETE))).toEqual([[60, 200, 640, 360], [740, 200, 640, 360]]);
  });

  it('1 câmera fica no centro e cresce', () => {
    const [c] = gradeCameras(1, AREA_MESA);
    expect(c.w).toBeGreaterThan(1000);
    expect(c.x + c.w / 2).toBeCloseTo(AREA_MESA.x + AREA_MESA.w / 2, -1);
    expect(c.y + c.h / 2).toBeCloseTo(AREA_MESA.y + AREA_MESA.h / 2, -1);
  });

  it('2 lado a lado, 3 em colunas (uma linha)', () => {
    const duas = gradeCameras(2, AREA_MESA);
    expect(duas[0].y).toBe(duas[1].y);
    const tres = gradeCameras(3, AREA_MESA);
    expect(new Set(tres.map((c) => c.y)).size).toBe(1);
  });

  it('linha incompleta fica centralizada', () => {
    const cinco = gradeCameras(5, AREA_MESA);
    const [a, b] = cinco.slice(3);
    expect(a.y).toBe(b.y);
    expect((a.x + b.x + b.w) / 2).toBeCloseTo(AREA_MESA.x + AREA_MESA.w / 2, 0);
  });

  it('sempre 16:9 exato, dentro da área (com a etiqueta do nome embaixo) e sem sobrepor', () => {
    for (const [area, max] of [[AREA_MESA, 6], [AREA_FILME, 4], [AREA_FUTEBOL, 2], [AREA_FUTEBOL_ENQUETE, 2]] as const)
      for (let n = 1; n <= max; n++) {
        const g = gradeCameras(n, area);
        expect(g).toHaveLength(n);
        for (const c of g) {
          expect(c.w * 9).toBe(c.h * 16);
          expect(c.x).toBeGreaterThanOrEqual(area.x);
          expect(c.y).toBeGreaterThanOrEqual(area.y);
          expect(c.x + c.w).toBeLessThanOrEqual(area.x + area.w);
          expect(c.y + c.h).toBeLessThanOrEqual(area.y + area.h);
        }
        for (const a of g)
          for (const b of g)
            if (a !== b) expect(a.x + a.w + 20 <= b.x || b.x + b.w + 20 <= a.x || a.y + a.h + 40 <= b.y || b.y + b.h + 40 <= a.y).toBe(true);
      }
  });
});
