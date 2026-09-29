import { describe, expect, it } from 'vitest';
import { itensLetreiro, partesPixLink, reais, rotuloJogo } from './formatar';

describe('reais', () => {
  it('inteiro sem casas, quebrado com vírgula', () => {
    expect(reais(25)).toBe('25');
    expect(reais(25.5)).toBe('25,50');
    expect(reais(0)).toBe('0');
  });
});

describe('itensLetreiro', () => {
  it('separa por ●, • ou | e ignora vazios', () => {
    expect(itensLetreiro('A ● B •C| D ●  ')).toEqual(['A', 'B', 'C', 'D']);
  });
});

describe('partesPixLink', () => {
  it('quebra na primeira barra mantendo a barra no fim da primeira parte', () => {
    expect(partesPixLink('LIVEPIX.GG/UNIDADESECRETA')).toEqual(['LIVEPIX.GG/', 'UNIDADESECRETA']);
    expect(partesPixLink('SEMBARRA')).toEqual(['SEMBARRA', '']);
  });
});

describe('rotuloJogo', () => {
  it('usa o texto livre quando OUTRO', () => {
    expect(rotuloJogo({ jogo: '2º TEMPO', jogoOutro: 'X' })).toBe('2º TEMPO');
    expect(rotuloJogo({ jogo: 'OUTRO', jogoOutro: 'PÊNALTIS' })).toBe('PÊNALTIS');
  });
});
