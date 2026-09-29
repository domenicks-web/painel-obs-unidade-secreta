import type { PropsTela } from './tipos';
import { SlotCamera } from './SlotCamera';
import { FaixaTicker } from './FaixaTicker';
import { SeloAoVivo } from './Pecas';

const POSICOES: [number, number][] = [
  [60, 160], [670, 160], [1280, 160],
  [60, 570], [670, 570], [1280, 570],
];

export function TelaMesa({ estado, previa }: PropsTela) {
  return (
    <div className="t-escuro">
      <div className="t-topo">
        <div className="t-us">US</div>
        <div className="t-selo">MESA REDONDA</div>
        <div className="t-topo__titulo">{estado.titulo}</div>
      </div>
      <SeloAoVivo className="t-mesa__aovivo" />
      {POSICOES.map(([x, y], i) => (
        <SlotCamera key={i} nome={estado.nomes[i] || `NOME 0${i + 1}`} w={580} h={326} x={x} y={y} previa={previa} />
      ))}
      <FaixaTicker ticker={estado.ticker} />
    </div>
  );
}
