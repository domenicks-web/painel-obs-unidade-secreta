import { describe, expect, it } from 'vitest';
import { formatRelogio, calcularRestante, formatarTempoRelativo } from './tempo';

describe('formatRelogio', () => {
  it('formata minutos e segundos com zero à esquerda', () => {
    expect(formatRelogio(65_000)).toBe('01:05');
  });

  it('formata zero como 00:00', () => {
    expect(formatRelogio(0)).toBe('00:00');
  });

  it('trunca frações de segundo', () => {
    expect(formatRelogio(59_999)).toBe('00:59');
  });
});

describe('calcularRestante', () => {
  it('usa minutos configurados quando o cronômetro não foi iniciado (fim=0)', () => {
    expect(calcularRestante({ fim: 0, minutos: 5 }, 1_000_000)).toBe(5 * 60_000);
  });

  it('calcula o tempo restante até "fim" usando o horário do servidor', () => {
    expect(calcularRestante({ fim: 10_000, minutos: 5 }, 4_000)).toBe(6_000);
  });

  it('nunca retorna valor negativo após o fim', () => {
    expect(calcularRestante({ fim: 10_000, minutos: 5 }, 99_000)).toBe(0);
  });
});

describe('formatarTempoRelativo', () => {
  it('mostra segundos para menos de um minuto', () => {
    expect(formatarTempoRelativo(5_000, 10_000)).toBe('há 5s');
  });

  it('mostra minutos a partir de 60s', () => {
    expect(formatarTempoRelativo(0, 90_000)).toBe('há 1min');
  });

  it('mostra "agora" para diferenças menores que 1s', () => {
    expect(formatarTempoRelativo(9_800, 10_000)).toBe('agora');
  });
});
