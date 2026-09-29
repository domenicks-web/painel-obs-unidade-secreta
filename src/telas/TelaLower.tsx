import type { PropsTela } from './tipos';

export function TelaLower({ estado, previa }: PropsTela) {
  // no OBS o fundo é transparente; na prévia usa o fundo da referência pra dar contraste
  return (
    <div className="t-lower" style={{ background: previa ? '#2A2226' : 'transparent' }}>
      <div className="t-lower__cartao">
        <div className="t-lower__listra" />
        <div className="t-lower__corpo">
          <div className="t-lower__nome">{estado.ltNome}</div>
          <div className="t-lower__linha">
            <div className="t-lower__grade">
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} />
              ))}
            </div>
            <div className="t-lower__funcao">{estado.funcao}</div>
          </div>
        </div>
        <div className="t-lower__fim" />
      </div>
    </div>
  );
}
