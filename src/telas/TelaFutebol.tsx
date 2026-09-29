import type { PropsTela } from './tipos';
import { SlotCamera } from './SlotCamera';
import { FaixaTicker } from './FaixaTicker';
import { RelogioJogo } from './RelogioJogo';
import { rotuloJogo } from '../live/formatar';

const pct = (v: number) => Math.min(100, Math.max(0, Number(v) || 0)) + '%';

export function TelaFutebol({ estado, previa }: PropsTela) {
  const { enquete } = estado;
  // câmeras 16:9; sem a enquete ficam centralizadas no espaço que ela deixa
  const yCam = enquete.mostrar ? 200 : 370;
  const opcoes: [string, number, string, string][] = [
    [estado.timeA, enquete.casa, '#FF6B1F', '0s'],
    ['EMPATE', enquete.empate, '#FFF3E0', '.15s'],
    [estado.timeB, enquete.fora, '#8B6CF0', '.3s'],
  ];

  return (
    <div className="t-futebol">
      <div className="t-futebol__gramado" />
      <div className="t-futebol__placar">
        <div className="t-futebol__us">US</div>
        <div className="t-futebol__time t-futebol__time--a">{estado.timeA}</div>
        <div className="t-futebol__gols">
          <div className="t-futebol__gol">{estado.golsA}</div>
          <div className="t-futebol__x">×</div>
          <div className="t-futebol__gol">{estado.golsB}</div>
        </div>
        <div className="t-futebol__time">{estado.timeB}</div>
        <div className="t-futebol__tempo">
          <RelogioJogo className="t-futebol__relogio" estado={estado} />
          <div className="t-futebol__jogo">
            <div className="t-futebol__jogo-led" />
            <div className="t-futebol__jogo-txt">{rotuloJogo(estado)}</div>
          </div>
        </div>
      </div>
      <SlotCamera nome={estado.nomes[0] || 'NOME 01'} w={640} h={360} x={60} y={yCam} previa={previa} />
      <SlotCamera nome={estado.nomes[1] || 'NOME 02'} w={640} h={360} x={740} y={yCam} previa={previa} />
      {enquete.mostrar && (
        <div className="t-futebol__enquete">
          <div className="t-futebol__enquete-titulo">QUEM GANHA?</div>
          {opcoes.map(([nome, valor, cor, atraso], i) => (
            <div key={i} className="t-futebol__opcao">
              <div className="t-futebol__opcao-nome">{nome}</div>
              <div className="t-futebol__opcao-trilho">
                <div className="t-futebol__opcao-barra" style={{ width: pct(valor), background: cor, animationDelay: atraso }} />
              </div>
              <div className="t-futebol__opcao-pct" style={{ color: cor }}>
                {pct(valor)}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="t-caixa-chat" style={{ left: 1420, top: 150, width: 440, height: 800 }}>
        {previa && 'CHAT · 440×800'}
      </div>
      <FaixaTicker ticker={estado.ticker} />
    </div>
  );
}
