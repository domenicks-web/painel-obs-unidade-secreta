import type { EstadoLive } from '../live/tipos';
import { camerasDaTela, type TelaCam } from './cameras';

interface Props {
  nome: string;
  w: number;
  h: number;
  x: number;
  y: number;
  previa?: boolean;
}

export function SlotCamera({ nome, w, h, x, y, previa }: Props) {
  return (
    <div className="t-slot" style={{ left: x, top: y, width: w, height: h }}>
      {previa && <div className="t-slot__placeholder">CÂMERA · {w}×{h}</div>}
      {/* etiqueta com tamanho fixo, presa embaixo: não estica com a moldura */}
      {nome && (
        <div className="t-slot__tag">
          <div className="t-slot__led-box">
            <div className="t-slot__led" />
          </div>
          <div className="t-slot__nome">{nome}</div>
        </div>
      )}
    </div>
  );
}

/** Molduras da tela, na ordem da lista (a última fica na frente). X/Y da câmera é o canto inferior esquerdo. */
export function Molduras({ estado, tela, previa }: { estado: EstadoLive; tela: TelaCam; previa?: boolean }) {
  return (
    <>
      {camerasDaTela(estado, tela).map((c) => (
        <SlotCamera key={c.id} nome={c.nome} w={c.w} h={c.h} x={c.x} y={c.y - c.h} previa={previa} />
      ))}
    </>
  );
}
