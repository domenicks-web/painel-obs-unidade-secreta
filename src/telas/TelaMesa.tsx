import type { PropsTela } from './tipos';
import { FaixaTicker } from './FaixaTicker';
import { SeloAoVivo } from './Pecas';
import { Molduras } from './SlotCamera';

export function TelaMesa({ estado, previa }: PropsTela) {
  return (
    <div className="t-escuro">
      <div className="t-topo">
        <div className="t-us">US</div>
        <div className="t-selo">MESA REDONDA</div>
        <div className="t-topo__titulo">{estado.titulo}</div>
      </div>
      <SeloAoVivo className="t-mesa__aovivo" />
      <Molduras estado={estado} tela="mesa" previa={previa} />
      <FaixaTicker ticker={estado.ticker} />
    </div>
  );
}
