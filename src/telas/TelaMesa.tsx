import type { PropsTela } from './tipos';
import { SlotCamera } from './SlotCamera';
import { FaixaTicker } from './FaixaTicker';
import { SeloAoVivo } from './Pecas';
import { AREA_MESA, gradeCameras } from './grade';
import { qtdCams } from '../live/tipos';

export function TelaMesa({ estado, previa }: PropsTela) {
  return (
    <div className="t-escuro">
      <div className="t-topo">
        <div className="t-us">US</div>
        <div className="t-selo">MESA REDONDA</div>
        <div className="t-topo__titulo">{estado.titulo}</div>
      </div>
      <SeloAoVivo className="t-mesa__aovivo" />
      {!estado.camsManuais &&
        gradeCameras(qtdCams('mesa', estado.mesaCams), AREA_MESA).map((c, i) => (
          <SlotCamera key={i} nome={estado.nomes[i] || `NOME 0${i + 1}`} {...c} previa={previa} />
        ))}
      <FaixaTicker ticker={estado.ticker} />
    </div>
  );
}
