import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { ESTADO_PADRAO, type EstadoLive } from '../live/tipos';
import { TelaHost } from './TelaHost';
import { TelaFutebol } from './TelaFutebol';
import { TelaFilme } from './TelaFilme';
import { TelaMesa } from './TelaMesa';

// Pedido do usuário: toda moldura de câmera por dentro em 16:9 (a webcam entra sem corte nem faixa)
// e o chat de Host, Futebol e Filme com 440×800 por dentro.
const px = (v: string) => Number(v.replace('px', ''));
const medidas = (c: HTMLElement, sel: string) =>
  [...c.querySelectorAll<HTMLElement>(sel)].map((e) => ({ w: px(e.style.width), h: px(e.style.height), x: px(e.style.left), y: px(e.style.top) }));

const CASOS: [string, (e: EstadoLive) => ReactElement, Partial<EstadoLive>, number][] = [
  ['host 1 câmera', (e) => <TelaHost estado={e} />, { hostCams: '1' }, 1],
  ['host 2 câmeras', (e) => <TelaHost estado={e} />, { hostCams: '2' }, 2],
  ['host 3 câmeras', (e) => <TelaHost estado={e} />, { hostCams: '3' }, 3],
  ['futebol com enquete', (e) => <TelaFutebol estado={e} />, { enquete: { casa: 1, empate: 1, fora: 1, mostrar: true } }, 2],
  ['futebol sem enquete', (e) => <TelaFutebol estado={e} />, { enquete: { casa: 1, empate: 1, fora: 1, mostrar: false } }, 2],
  ['filme', (e) => <TelaFilme estado={e} />, {}, 4],
  ['mesa', (e) => <TelaMesa estado={e} />, {}, 6],
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
