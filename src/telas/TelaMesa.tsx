import type { PropsTela } from './tipos';
import { SlotCamera } from './SlotCamera';
import { FaixaTicker } from './FaixaTicker';
import { SeloAoVivo } from './Pecas';

const POSICOES: [number, number][] = [
  [62, 160], [672, 160], [1282, 160],
  [62, 570], [672, 570], [1282, 570],
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
        <SlotCamera key={i} nome={estado.nomes[i] || `NOME 0${i + 1}`} w={576} h={324} x={x} y={y} previa={previa} />
      ))}
      <FaixaTicker ticker={estado.ticker} />
    </div>
  );
}
