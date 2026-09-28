import { useEffect, useRef } from 'react';

const APAGADA = '#3a3035';
const cor = (i: number) => (i === 9 ? '#FFF3E0' : '#FF6B1F');

// As cores são animadas direto no elemento (element.animate), sem estado do React,
// pra página não redesenhar a cada ciclo. Uma bolinha acesa por vez, sorteada.
export function LogoBolinhas({ acesas }: { acesas: boolean }) {
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const els = refs.current;
    if (!els[0]?.animate) return;

    if (acesas) {
      const anims = els.map((el, i) =>
        el!.animate([{ background: APAGADA }, { background: cor(i) }], { duration: 300, delay: i * 50, fill: 'forwards' }),
      );
      return () => anims.forEach((a) => a.cancel());
    }

    let anim: Animation | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let anterior = -1;

    function proxima() {
      let n;
      do n = Math.floor(Math.random() * 10);
      while (n === anterior);
      anterior = n;
      anim = els[n]!.animate(
        [
          { background: APAGADA, offset: 0 },
          { background: cor(n), offset: 0.222 },
          { background: cor(n), offset: 0.778 },
          { background: APAGADA, offset: 1 },
        ],
        { duration: 2700, easing: 'ease-in-out' },
      );
      anim.onfinish = () => {
        timeout = setTimeout(proxima, 300);
      };
    }

    proxima();
    return () => {
      anim?.cancel();
      clearTimeout(timeout);
    };
  }, [acesas]);

  return (
    <div className="login__logo-grade">
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
        />
      ))}
    </div>
  );
}
