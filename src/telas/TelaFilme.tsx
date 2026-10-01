import type { PropsTela } from './tipos';
import { SlotCamera } from './SlotCamera';
import { AREA_FILME, gradeCameras } from './grade';
import { qtdCams } from '../live/tipos';

export function TelaFilme({ estado, previa }: PropsTela) {
  return (
    <div className="t-filme">
      <div className="t-filme__topo">
        <div className="t-filme__sessao">SESSÃO US</div>
        <div className="t-filme__leds">
          <div />
          <div />
          <div />
        </div>
        <div className="t-filme__aviso">ASSISTINDO JUNTO · SEM SPOILER NO CHAT</div>
      </div>
      {!estado.camsManuais &&
        gradeCameras(qtdCams('filme', estado.filmeCams), AREA_FILME).map((c, i) => (
          <SlotCamera key={i} nome={estado.nomes[i] || `NOME 0${i + 1}`} {...c} previa={previa} />
        ))}
      <div className="t-caixa-chat" style={{ left: 1420, top: 130, width: 440, height: 800 }}>
        {previa && 'CHAT · 440×800'}
      </div>
      <div className="t-filme__rodape">
        <div className="t-filme__cartaz">EM CARTAZ</div>
        <div className="t-filme__nome">{estado.filme}</div>
        <div className="t-filme__episodio">{estado.episodio}</div>
        <div className="t-filme__progresso">
          <div />
        </div>
      </div>
    </div>
  );
}
