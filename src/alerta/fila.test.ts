import { describe, expect, it } from 'vitest';
import { reduzirFila, type EstadoFila } from './fila';
import type { Pix } from '../live/tipos';

const p = (id: string, off = false): Pix => ({ id, nome: id, valor: 10, msg: '', origem: 'manual', externo_id: null, off, created_at: '' });
const vazio: EstadoFila = { atual: null, fase: null, espera: [] };

describe('fila do alerta', () => {
  it('primeiro PIX entra direto; os outros esperam na ordem', () => {
    let s = reduzirFila(vazio, { tipo: 'novo', pix: p('a') });
    s = reduzirFila(s, { tipo: 'novo', pix: p('b') });
    s = reduzirFila(s, { tipo: 'novo', pix: p('c') });
    expect(s.atual?.id).toBe('a');
    expect(s.fase).toBe('entrando');
    expect(s.espera.map((x) => x.id)).toEqual(['b', 'c']);
  });

  it('avança entrando → parado → saindo → próximo, sem pular', () => {
    let s = reduzirFila(vazio, { tipo: 'novo', pix: p('a') });
    s = reduzirFila(s, { tipo: 'novo', pix: p('b') });
    s = reduzirFila(s, { tipo: 'avancar' });
    expect(s.fase).toBe('parado');
    s = reduzirFila(s, { tipo: 'avancar' });
    expect(s.fase).toBe('saindo');
    s = reduzirFila(s, { tipo: 'avancar' });
    expect(s.atual?.id).toBe('b');
    expect(s.fase).toBe('entrando');
    s = reduzirFila(reduzirFila(reduzirFila(s, { tipo: 'avancar' }), { tipo: 'avancar' }), { tipo: 'avancar' });
    expect(s).toEqual(vazio);
  });

  it('PIX que chega já "não contar" é ignorado', () => {
    expect(reduzirFila(vazio, { tipo: 'novo', pix: p('a', true) })).toEqual(vazio);
  });

  it('marcar "não contar" tira da espera, mas não corta o que está na tela', () => {
    let s = reduzirFila(vazio, { tipo: 'novo', pix: p('a') });
    s = reduzirFila(s, { tipo: 'novo', pix: p('b') });
    s = reduzirFila(s, { tipo: 'mudou', pix: p('b', true) });
    expect(s.espera).toEqual([]);
    s = reduzirFila(s, { tipo: 'mudou', pix: p('a', true) });
    expect(s.atual?.id).toBe('a');
  });

  it('voltar a contar não re-enfileira; PIX repetido não entra duas vezes', () => {
    let s = reduzirFila(vazio, { tipo: 'novo', pix: p('a') });
    s = reduzirFila(s, { tipo: 'mudou', pix: p('z', false) });
    expect(s.espera).toEqual([]);
    s = reduzirFila(s, { tipo: 'novo', pix: p('a') });
    expect(s.espera).toEqual([]);
  });
});
