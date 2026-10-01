import type { PropsTela } from './tipos';
import { Molduras } from './SlotCamera';

// JOGO: tela vazia e transparente; só as molduras (gameplay + câmera), que o OBS cobre.
export function TelaJogo({ estado, previa }: PropsTela) {
  return (
    <div className="t-vazia">
      <Molduras estado={estado} tela="jogo" previa={previa} />
    </div>
  );
}
