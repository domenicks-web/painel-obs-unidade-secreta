import type { PropsTela } from './tipos';
import { Molduras } from './SlotCamera';
import { FaixaTicker } from './FaixaTicker';
import { ChatFutebol, PlacarFutebol } from './PlacarFutebol';

const pct = (v: number) => Math.min(100, Math.max(0, Number(v) || 0)) + '%';

export function TelaFutebol({ estado, previa }: PropsTela) {
  const { enquete } = estado;
  const opcoes: [string, number, string, string][] = [
    [estado.timeA, enquete.casa, '#FF6B1F', '0s'],
    ['EMPATE', enquete.empate, '#FFF3E0', '.15s'],
    [estado.timeB, enquete.fora, '#8B6CF0', '.3s'],
  ];

  return (
    <div className="t-futebol">
      <div className="t-futebol__gramado" />
      <PlacarFutebol estado={estado} />
      {/* automático: sem a enquete as câmeras ficam centralizadas no espaço que ela deixa */}
      <Molduras estado={estado} tela="futebol" previa={previa} />
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
      <ChatFutebol previa={previa} />
      <FaixaTicker ticker={estado.ticker} />
    </div>
  );
}
