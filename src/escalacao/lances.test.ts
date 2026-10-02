import { describe, expect, it } from 'vitest';
import { lanceRecente, lerPessoa, minutoDoJogo, ocupantes, sanitizarLances, textoLance, type Lance } from './lances';

const tit = [
  { numero: 1, nome: 'Alisson' },
  { numero: 10, nome: 'Rodrygo' },
  { numero: 11, nome: 'Vini Jr.' },
];
let n = 0;
const lance = (p: Partial<Lance>): Lance => ({ id: `l${++n}`, lado: 'casa', tipo: 'gol', slot: 2, numero: 11, nome: 'Vini Jr.', minuto: 10, em: 0, ...p });

describe('lances', () => {
  it('gol e cartões contam pra quem está no slot; dois amarelos expulsam', () => {
    const ls = [lance({}), lance({}), lance({ tipo: 'amarelo', slot: 1, numero: 10, nome: 'Rodrygo' }), lance({ tipo: 'amarelo', slot: 1, numero: 10, nome: 'Rodrygo' })];
    const o = ocupantes(tit, ls, 'casa');
    expect(o[2]).toMatchObject({ gols: 2, expulso: false, ultimo: ls[1].id });
    expect(o[1]).toMatchObject({ amarelos: 2, expulso: true });
    expect(o[0]).toMatchObject({ gols: 0, ultimo: null });
  });

  it('vermelho direto expulsa; lance do outro time não conta', () => {
    const o = ocupantes(tit, [lance({ tipo: 'vermelho', slot: 0, numero: 1, nome: 'Alisson' }), lance({ lado: 'visitante' })], 'casa');
    expect(o[0].expulso).toBe(true);
    expect(o[2].gols).toBe(0);
  });

  it('substituição troca quem ocupa o slot; os lances do novo são dele', () => {
    const ls = [
      lance({ tipo: 'amarelo' }),
      lance({ tipo: 'sub', entra: { numero: 9, nome: 'Endrick' } }),
      lance({ tipo: 'gol', numero: 9, nome: 'Endrick' }),
      lance({ tipo: 'gol' }), // Vini já saiu: não conta
    ];
    const o = ocupantes(tit, ls, 'casa');
    expect(o[2]).toMatchObject({ numero: 9, nome: 'Endrick', entrou: true, gols: 1, amarelos: 0 });
  });

  it('substituição de quem não está em campo é ignorada', () => {
    const o = ocupantes(tit, [lance({ tipo: 'sub', numero: 99, nome: 'X', entra: { numero: 9, nome: 'Endrick' } })], 'casa');
    expect(o[2].nome).toBe('Vini Jr.');
  });

  it('minuto como se fala e texto do lance', () => {
    expect(minutoDoJogo(30)).toBe(1);
    expect(minutoDoJogo(66 * 60 + 10)).toBe(67);
    expect(textoLance(lance({ minuto: 67 }))).toBe("67' GOL · VINI JR.");
    expect(textoLance(lance({ tipo: 'sub', minuto: 60, entra: { numero: 9, nome: 'Endrick' } }))).toBe("60' SAI VINI JR., ENTRA ENDRICK");
    expect(textoLance(lance({ tipo: 'amarelo', minuto: null }))).toBe('AMARELO · VINI JR.');
  });

  it('aviso só pro lance mais novo, por 8 s', () => {
    const ls = [lance({ em: 1000 }), lance({ em: 5000 })];
    expect(lanceRecente(ls, 6000)?.id).toBe(ls[1].id);
    expect(lanceRecente(ls, 13001)).toBeNull();
    expect(lanceRecente([], 0)).toBeNull();
  });

  it('sanitizar descarta lixo e sub sem quem entra', () => {
    const ok = lance({});
    const r = sanitizarLances([ok, null, { id: 'x', lado: 'casa', tipo: 'pênalti' }, { ...lance({ tipo: 'sub' }), entra: undefined }, 'a']);
    expect(r).toEqual([ok]);
    expect(sanitizarLances(undefined)).toEqual([]);
  });

  it('lerPessoa', () => {
    expect(lerPessoa('9 Endrick')).toEqual({ numero: 9, nome: 'Endrick' });
    expect(lerPessoa('Endrick')).toBeNull();
  });
});
