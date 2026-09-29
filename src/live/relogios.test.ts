import { describe, expect, it } from 'vitest';
import { bolinhasCheias, mmss, segundosJogo, segundosRestantes } from './relogios';

describe('segundosRestantes', () => {
  it('parado (sem timerInicio) mostra o total', () => {
    expect(segundosRestantes(5, null, 1_000_000)).toBe(300);
  });
  it('conta a partir do timerInicio do servidor', () => {
    expect(segundosRestantes(5, 1_000_000, 1_000_000 + 61_000)).toBe(239);
  });
  it('arredonda pra cima dentro do segundo (mostra 05:00 no primeiro segundo)', () => {
    expect(segundosRestantes(5, 1_000_000, 1_000_400)).toBe(300);
  });
  it('para em zero e não fica negativo nem recomeça', () => {
    expect(segundosRestantes(5, 0, 301_000)).toBe(0);
    expect(segundosRestantes(5, 0, 10_000_000)).toBe(0);
  });
});

describe('bolinhasCheias', () => {
  it('segue a fórmula da referência', () => {
    expect(bolinhasCheias(300, 300)).toBe(0);
    expect(bolinhasCheias(150, 300)).toBe(5);
    expect(bolinhasCheias(0, 300)).toBe(10);
  });
});

describe('segundosJogo', () => {
  it('parado usa só o acumulado', () => {
    expect(segundosJogo({ clockInicio: null, clockAcumulado: 125, clockRodando: false }, 9e12)).toBe(125);
  });
  it('rodando soma o trecho desde o início', () => {
    expect(segundosJogo({ clockInicio: 1_000_000, clockAcumulado: 60, clockRodando: true }, 1_000_000 + 30_500)).toBe(90);
  });
});

describe('mmss', () => {
  it('formata com zero à esquerda', () => {
    expect(mmss(0)).toBe('00:00');
    expect(mmss(305)).toBe('05:05');
    expect(mmss(6000)).toBe('100:00');
  });
});
