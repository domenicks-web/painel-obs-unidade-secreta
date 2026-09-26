import { Estado } from '../../types/estado';
import { Dots } from './Dots';

interface Props {
  estado: Estado;
}

export function Intervalo({ estado }: Props) {
  return (
    <div className="intervalo">
      <div className="intervalo__logo">US</div>
      <div className="intervalo__centro">
        <div className="intervalo__label">INTERVALO</div>
        <div className="intervalo__msg">{estado.msg}</div>
        <Dots variante="respira" />
      </div>
      <div className="intervalo__listras" />
    </div>
  );
}
