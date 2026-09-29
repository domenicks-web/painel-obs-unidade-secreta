import type { PropsTela } from './tipos';
import { SlotCamera } from './SlotCamera';

const POSICOES: [number, number][] = [
  [60, 130], [756, 130],
  [60, 550], [756, 550],
];

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
      {POSICOES.map(([x, y], i) => (
        <SlotCamera key={i} nome={estado.nomes[i] || `NOME 0${i + 1}`} w={624} h={351} x={x} y={y} previa={previa} />
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
