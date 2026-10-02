import type { EstadoLive } from '../live/tipos';
import { RelogioJogo } from './RelogioJogo';
import { rotuloJogo } from '../live/formatar';
import { useOffsetServidor } from '../live/relogioServidor';
import { useGolAoVivo } from '../gol/useGolAoVivo';
import '../gol/gol.css';

/** Placar do topo (times, gols com o pulo do gol, relógio e tempo): FUTEBOL e ESCALAÇÃO. */
export function PlacarFutebol({ estado }: { estado: EstadoLive }) {
  const { pulso } = useGolAoVivo(estado.golEvento, useOffsetServidor());
  const gols = (lado: 'A' | 'B', v: number) =>
    pulso?.lado === lado ? (
      <span key={pulso.id} className="g-pop">
        {v}
      </span>
    ) : (
      v
    );

  return (
    <div className="t-futebol__placar">
      <div className="t-futebol__us">US</div>
      <div className="t-futebol__time t-futebol__time--a">{estado.timeA}</div>
      <div className="t-futebol__gols">
        <div className="t-futebol__gol">{gols('A', estado.golsA)}</div>
        <div className="t-futebol__x">×</div>
        <div className="t-futebol__gol">{gols('B', estado.golsB)}</div>
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
  );
}

/** Caixa reservada pro chat (fonte do OBS por cima): a mesma do FUTEBOL. */
export function ChatFutebol({ previa }: { previa?: boolean }) {
  return (
    <div className="t-caixa-chat" style={{ left: 1420, top: 150, width: 440, height: 800 }}>
      {previa && 'CHAT · 440×800'}
    </div>
  );
}
