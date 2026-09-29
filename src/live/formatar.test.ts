import { describe, expect, it } from 'vitest';
import { formatarTempoRelativo, itensLetreiro, partesPixLink, reais, rotuloJogo } from './formatar';

describe('reais', () => {
  it('inteiro sem casas, quebrado com vírgula', () => {
    expect(reais(25)).toBe('25');
    expect(reais(25.5)).toBe('25,50');
    expect(reais(0)).toBe('0');
    expect(reais(1250)).toBe('1.250');
    expect(reais(1250.5)).toBe('1.250,50');
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
