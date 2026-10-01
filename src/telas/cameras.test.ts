import { describe, expect, it } from 'vitest';
import { ESTADO_PADRAO, type EstadoLive } from '../live/tipos';
import {
  CHAVE_CAMS,
  MAX_CAMERAS,
  camerasDaTela,
  layoutAutomatico,
  mudarTamanho,
  mudarFormato,
  moverOrdem,
  novaCamera,
  sanitizar,
  type Camera,
} from './cameras';

const est = (extra: Partial<EstadoLive> = {}): EstadoLive => ({ ...ESTADO_PADRAO, ...extra });
const cam = (extra: Partial<Camera> = {}): Camera => ({ id: 'a', nome: 'ANA', formato: '16:9', w: 640, h: 360, x: 100, y: 500, ...extra });

describe('layoutAutomatico (ponto de partida)', () => {
  it('reproduz as posições aprovadas, com X/Y no canto inferior esquerdo', () => {
    const mesa = layoutAutomatico('mesa', 6, est());
    expect(mesa[0]).toMatchObject({ x: 62, y: 160 + 324, w: 576, h: 324, formato: '16:9', nome: 'NOME 01' });
    expect(mesa[5]).toMatchObject({ x: 1282, y: 570 + 324 });
    const host1 = layoutAutomatico('host', 1, est());
    expect(host1).toHaveLength(1);
    expect(host1[0]).toMatchObject({ x: 60, y: 150 + 522, w: 928, h: 522 });
    expect(layoutAutomatico('host', 3, est()).map((c) => [c.w, c.h])).toEqual([[896, 504], [400, 225], [400, 225]]);
    expect(layoutAutomatico('futebol', 2, est()).map((c) => c.y)).toEqual([370 + 360, 370 + 360]);
    expect(layoutAutomatico('futebol', 2, est({ enquete: { casa: 0, empate: 0, fora: 0, mostrar: true } })).map((c) => c.y)).toEqual([560, 560]);
  });

  it('nomes vêm dos nomes das câmeras de antes', () => {
    const l = layoutAutomatico('filme', 2, est({ nomes: ['ANA', 'BIA', '', '', '', ''] }));
    expect(l.map((c) => c.nome)).toEqual(['ANA', 'BIA']);
  });
});

describe('camerasDaTela', () => {
  it('sem layout salvo: automático (host segue o 1/2/3 escolhido)', () => {
    expect(camerasDaTela(est(), 'mesa')).toHaveLength(6);
    expect(camerasDaTela(est(), 'filme')).toHaveLength(4);
    expect(camerasDaTela(est(), 'futebol')).toHaveLength(2);
    expect(camerasDaTela(est({ hostCams: '3' }), 'host')).toHaveLength(3);
  });
  it('com layout salvo: usa o salvo, limpo', () => {
    const e = est({ [CHAVE_CAMS.mesa]: [cam(), cam({ id: 'b', w: 99999 })] } as Partial<EstadoLive>);
    const l = camerasDaTela(e, 'mesa');
    expect(l).toHaveLength(2);
    expect(l[1].w).toBeLessThanOrEqual(1920);
  });
  it('lista vazia salva = sem câmera nenhuma (não volta pro automático)', () => {
    expect(camerasDaTela(est({ [CHAVE_CAMS.filme]: [] } as Partial<EstadoLive>), 'filme')).toEqual([]);
  });
});

describe('sanitizar', () => {
  it('descarta lixo, corrige formato e trava a proporção', () => {
    const l = sanitizar([cam(), null, { id: 'x' }, cam({ id: 'c', formato: 'esquisito' as never, w: 400, h: 10 }), cam({ id: 'd', formato: '1:1', w: 300, h: 100 })]);
    if (!l) throw new Error('lista');
    expect(l.map((c) => c.id)).toEqual(['a', 'c', 'd']);
    expect(l[1]).toMatchObject({ formato: 'livre', w: 400, h: 40 }); // altura mínima
    expect(l[2]).toMatchObject({ w: 300, h: 300 });
  });
  it('no máximo MAX_CAMERAS', () => {
    expect(sanitizar(Array.from({ length: 30 }, (_, i) => cam({ id: String(i) })))).toHaveLength(MAX_CAMERAS);
  });
  it('não é lista: null', () => {
    expect(sanitizar('oi')).toBeNull();
    expect(sanitizar(undefined)).toBeNull();
  });
});

describe('tamanho e formato', () => {
  it('formato travado: largura muda a altura, e vice-versa', () => {
    expect(mudarTamanho(cam(), { w: 1280 })).toMatchObject({ w: 1280, h: 720 });
    expect(mudarTamanho(cam({ formato: '4:3' }), { h: 300 })).toMatchObject({ w: 400, h: 300 });
    expect(mudarTamanho(cam({ formato: '9:16' }), { w: 360 })).toMatchObject({ w: 360, h: 640 });
  });
  it('livre: independentes', () => {
    expect(mudarTamanho(cam({ formato: 'livre' }), { w: 500 })).toMatchObject({ w: 500, h: 360 });
  });
  it('X/Y (canto inferior esquerdo) não mudam com o tamanho: cresce pra cima e pra direita', () => {
    const c = mudarTamanho(cam(), { w: 1280 });
    expect([c.x, c.y]).toEqual([100, 500]);
  });
  it('trocar o formato mantém a largura e acerta a altura', () => {
    expect(mudarFormato(cam(), '1:1')).toMatchObject({ w: 640, h: 640, formato: '1:1' });
    expect(mudarFormato(cam(), 'livre')).toMatchObject({ w: 640, h: 360, formato: 'livre' });
  });
  it('limites: mínimo 40, máximo a tela', () => {
    expect(mudarTamanho(cam({ formato: 'livre' }), { w: 5, h: 99999 })).toMatchObject({ w: 40, h: 1080 });
  });
});

describe('lista', () => {
  it('nova câmera: 16:9, centralizada, sem cair em cima da anterior', () => {
    const a = novaCamera([]);
    expect(a).toMatchObject({ formato: '16:9', w: 640, h: 360, x: 640, y: 720 });
    const b = novaCamera([a]);
    expect([b.x, b.y]).not.toEqual([a.x, a.y]);
    expect(b.id).not.toBe(a.id);
  });
  it('ordem: o último da lista fica na frente', () => {
    const l = [cam({ id: '1' }), cam({ id: '2' }), cam({ id: '3' })];
    expect(moverOrdem(l, 0, 1).map((c) => c.id)).toEqual(['2', '1', '3']);
    expect(moverOrdem(l, 2, 1).map((c) => c.id)).toEqual(['1', '2', '3']);
    expect(moverOrdem(l, 0, -1).map((c) => c.id)).toEqual(['1', '2', '3']);
  });
});

describe('telas JOGO e REACT', () => {
  it('JOGO: moldura da gameplay na tela inteira (sem etiqueta) e a câmera no canto de baixo à direita, na frente', () => {
    const [gameplay, cam] = camerasDaTela(est(), 'jogo');
    expect(gameplay).toMatchObject({ x: 0, y: 1080, w: 1920, h: 1080, nome: '' });
    expect(cam).toMatchObject({ w: 480, h: 270, x: 1400, y: 1010, nome: 'NOME 01', formato: '16:9' });
    expect(layoutAutomatico('jogo', 1, est())).toHaveLength(1); // só a câmera
    expect(layoutAutomatico('jogo', 1, est())[0].nome).toBe('NOME 01');
  });
  it('REACT: duas câmeras, uma em cada canto de cima', () => {
    const [esq, dir] = camerasDaTela(est(), 'react');
    expect(esq).toMatchObject({ x: 40, y: 310, w: 480, h: 270, nome: 'NOME 01' });
    expect(dir).toMatchObject({ x: 1400, y: 310, w: 480, h: 270, nome: 'NOME 02' });
    expect(layoutAutomatico('react', 1, est())).toHaveLength(1);
  });
  it('cada tela tem a sua chave', () => {
    expect(CHAVE_CAMS.jogo).toBe('camsJogo');
    expect(CHAVE_CAMS.react).toBe('camsReact');
  });
});
