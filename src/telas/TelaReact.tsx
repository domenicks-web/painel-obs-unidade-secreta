import type { PropsTela } from './tipos';
import { Molduras } from './SlotCamera';

// REACT: tela vazia e transparente; só as molduras das câmeras (padrão: uma em cada canto de cima).
export function TelaReact({ estado, previa }: PropsTela) {
  return (
    <div className="t-vazia">
      <Molduras estado={estado} tela="react" previa={previa} />
    </div>
  );
}
