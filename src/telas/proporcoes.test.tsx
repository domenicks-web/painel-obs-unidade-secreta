import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { ESTADO_PADRAO, type EstadoLive } from '../live/tipos';
import { TelaHost } from './TelaHost';
import { TelaFutebol } from './TelaFutebol';
import { TelaFilme } from './TelaFilme';
import { TelaMesa } from './TelaMesa';
import { layoutAutomatico } from './cameras';

// Pedido do usuário: toda moldura de câmera por dentro em 16:9 (a webcam entra sem corte nem faixa)
// e o chat de Host, Futebol e Filme com 440×800 por dentro.
const px = (v: string) => Number(v.replace('px', ''));
const medidas = (c: HTMLElement, sel: string) =>
  [...c.querySelectorAll<HTMLElement>(sel)].map((e) => ({ w: px(e.style.width), h: px(e.style.height), x: px(e.style.left), y: px(e.style.top) }));

type Caso = [string, (e: EstadoLive) => ReactElement, Partial<EstadoLive>, number];
const CASOS: Caso[] = [
  ['host 1 câmera', (e) => <TelaHost estado={e} />, { hostCams: '1' }, 1],
  ['host 2 câmeras', (e) => <TelaHost estado={e} />, { hostCams: '2' }, 2],
  ['host 3 câmeras', (e) => <TelaHost estado={e} />, { hostCams: '3' }, 3],
  ['futebol com enquete', (e) => <TelaFutebol estado={e} />, { enquete: { casa: 1, empate: 1, fora: 1, mostrar: true } }, 2],
  ['futebol sem enquete', (e) => <TelaFutebol estado={e} />, { enquete: { casa: 1, empate: 1, fora: 1, mostrar: false } }, 2],
  ['filme', (e) => <TelaFilme estado={e} />, {}, 4],
  ['mesa', (e) => <TelaMesa estado={e} />, {}, 6],
  // pontos de partida (layout automático com N câmeras, gravado como lista)
  ...[1, 2, 3, 4, 5].map((n) => [`mesa ${n} câmeras`, (e: EstadoLive) => <TelaMesa estado={e} />, { camsMesa: layoutAutomatico('mesa', n, ESTADO_PADRAO) }, n] as Caso),
  ...[1, 2, 3].map((n) => [`filme ${n} câmeras`, (e: EstadoLive) => <TelaFilme estado={e} />, { camsFilme: layoutAutomatico('filme', n, ESTADO_PADRAO) }, n] as Caso),
  ['futebol 1 câmera', (e) => <TelaFutebol estado={e} />, { camsFutebol: layoutAutomatico('futebol', 1, ESTADO_PADRAO) }, 1],
  // lista estragada no banco cai no automático
  ['mesa com lixo salvo', (e) => <TelaMesa estado={e} />, { camsMesa: 'lixo' as never }, 6],
];

describe('proporções', () => {
  it.each(CASOS)('%s: câmeras em 16:9 exato, dentro da tela, sem sobrepor', (_, tela, extra, qtd) => {
    const { container } = render(tela({ ...ESTADO_PADRAO, ...extra }));
    const cams = medidas(container, '.t-slot');
    expect(cams).toHaveLength(qtd);
    for (const c of cams) {
      expect(c.w * 9).toBe(c.h * 16);
      expect(c.x + c.w).toBeLessThanOrEqual(1860);
      expect(c.y + c.h).toBeLessThanOrEqual(1000);
    }
    for (const a of cams)
      for (const b of cams)
        if (a !== b) expect(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y).toBe(true);
  });

  it.each(CASOS.filter(([n]) => !n.startsWith('mesa')))('%s: chat 440×800', (_, tela, extra) => {
    const { container } = render(tela({ ...ESTADO_PADRAO, ...extra }));
    expect(medidas(container, '.t-chat, .t-caixa-chat').map(({ w, h }) => `${w}×${h}`)).toEqual(['440×800']);
  });
});

describe('molduras editadas no painel', () => {
  const slots = (c: HTMLElement) => medidas(c, '.t-slot');
  it('X/Y é o canto inferior esquerdo: a moldura cresce pra cima e a etiqueta fica no lugar', () => {
    const cam = { id: 'a', nome: 'ANA', formato: '16:9' as const, w: 640, h: 360, x: 100, y: 800 };
    const { container, rerender } = render(<TelaMesa estado={{ ...ESTADO_PADRAO, camsMesa: [cam] }} />);
    expect(slots(container)).toEqual([{ x: 100, y: 440, w: 640, h: 360 }]);
    rerender(<TelaMesa estado={{ ...ESTADO_PADRAO, camsMesa: [{ ...cam, w: 1280, h: 720 }] }} />);
    expect(slots(container)).toEqual([{ x: 100, y: 80, w: 1280, h: 720 }]); // embaixo continua em 800
  });
  it('a última da lista fica na frente; sem nome não tem etiqueta', () => {
    const base = { formato: 'livre' as const, w: 300, h: 300, x: 0, y: 500 };
    const { container } = render(
      <TelaFilme estado={{ ...ESTADO_PADRAO, camsFilme: [{ ...base, id: 'tras', nome: 'TRÁS' }, { ...base, id: 'frente', nome: '' }] }} />,
    );
    const els = container.querySelectorAll('.t-slot');
    expect(els).toHaveLength(2);
    expect(els[0].textContent).toContain('TRÁS');
    expect(els[1].querySelector('.t-slot__tag')).toBeNull();
  });
  it('etiqueta na direita: presa no canto de baixo à direita, nome antes do ícone', () => {
    const base = { formato: '16:9' as const, w: 640, h: 360, x: 0, y: 500, nome: 'ANA' };
    const { container } = render(<TelaMesa estado={{ ...ESTADO_PADRAO, camsMesa: [{ ...base, id: 'e' }, { ...base, id: 'd', etiqueta: 'direita' }] }} />);
    const [esq, dir] = [...container.querySelectorAll('.t-slot__tag')];
    expect(esq.className).toBe('t-slot__tag');
    expect(dir.className).toBe('t-slot__tag t-slot__tag--direita');
    expect(dir.firstElementChild!.className).toBe('t-slot__nome');
    expect(esq.firstElementChild!.className).toBe('t-slot__led-box');
  });

  it('etiqueta "nenhuma": moldura sem a etiqueta do nome', () => {
    const base = { formato: '16:9' as const, w: 640, h: 360, x: 0, y: 500, nome: 'ANA' };
    const { container } = render(<TelaMesa estado={{ ...ESTADO_PADRAO, camsMesa: [{ ...base, id: 'a', etiqueta: 'nenhuma' }, { ...base, id: 'b' }] }} />);
    const els = container.querySelectorAll('.t-slot');
    expect(els[0].querySelector('.t-slot__tag')).toBeNull();
    expect(els[1].querySelector('.t-slot__tag')).not.toBeNull();
  });

  it('lista vazia: nenhuma moldura, o resto da tela fica', () => {
    const { container } = render(<TelaHost estado={{ ...ESTADO_PADRAO, camsHost: [] }} />);
    expect(container.querySelectorAll('.t-slot')).toHaveLength(0);
    expect(container.textContent).toContain('META DA LIVE');
  });
});
