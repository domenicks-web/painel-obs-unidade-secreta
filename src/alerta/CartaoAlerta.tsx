import type { Pix } from '../live/tipos';
import type { Fase } from './fila';
import { reais } from '../live/formatar';
import './alerta.css';

export function CartaoAlerta({ pix, fase }: { pix: Pix; fase: Fase }) {
  return (
    <div className={`a-alerta a-alerta--${fase}`}>
      <div className="a-alerta__listra" />
      <div className="a-alerta__corpo">
        <div className="a-alerta__topo">
          <div className="a-alerta__selo">
            <span className="a-alerta__led" />
            PIX NA ÁREA
          </div>
          <div className="a-alerta__valor">R$ {reais(pix.valor)}</div>
        </div>
        <div className="a-alerta__nome">{pix.nome}</div>
        {pix.msg && <div className="a-alerta__msg">{pix.msg}</div>}
      </div>
    </div>
  );
}
