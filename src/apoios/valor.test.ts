import { describe, expect, it } from 'vitest';
import { emReais, lerValor, TAXAS_FIXAS } from './valor';

describe('lerValor', () => {
  it.each([
    ['R$ 10,00', 'BRL', 10],
    ['R$ 1.234,56', 'BRL', 1234.56],
    ['US$ 5.00', 'USD', 5],
    ['$5.00', 'USD', 5],
    ['$1,000.00', 'USD', 1000],
    ['€5,00', 'EUR', 5],
    ['£2.49', 'GBP', 2.49],
    ['MX$100.00', 'MXN', 100],
    ['CA$ 20.00', 'CAD', 20],
    ['A$10.00', 'AUD', 10],
    ['¥500', 'JPY', 500],
    ['₩1,000', 'KRW', 1000],
    ['ARS 1.000', 'ARS', 1000],
    ['1,000 COP', 'COP', 1000],
    ['CLP$2.000', 'CLP', 2000],
  ])('%s', (texto, moeda, quantia) => {
    expect(lerValor(texto)).toEqual({ moeda, quantia });
  });

  it('sem número ou sem moeda: null', () => {
    expect(lerValor('')).toBeNull();
    expect(lerValor('obrigado')).toBeNull();
    expect(lerValor('3 roses')).toBeNull();
  });
});

describe('emReais', () => {
  const taxas = { ...TAXAS_FIXAS, USD: 0.2, EUR: 0.16 };
  it('converte pela cotação (quanto 1 real vale na moeda)', () => {
    expect(emReais('US$ 10.00', taxas)).toBe(50);
    expect(emReais('€4,00', taxas)).toBe(25);
    expect(emReais('R$ 7,50', taxas)).toBe(7.5);
  });
  it('moeda desconhecida ou sem cotação: 0', () => {
    expect(emReais('₿ 1', taxas)).toBe(0);
    expect(emReais('XYZ 10', taxas)).toBe(0);
  });
});
