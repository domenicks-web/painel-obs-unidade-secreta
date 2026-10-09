import type { EstadoLive } from '../live/tipos';
import { camerasDaTela, type TelaCam } from './cameras';

interface Props {
  nome: string;
  w: number;
  h: number;
  x: number;
  y: number;
  previa?: boolean;
  etiqueta?: 'direita' | 'nenhuma';
}

export function SlotCamera({ nome, w, h, x, y, previa, etiqueta }: Props) {
  const led = (
    <div className="t-slot__led-box">
      <div className="t-slot__led" />
    </div>
  );
  const texto = <div className="t-slot__nome">{nome}</div>;
  return (
    <div className="t-slot" style={{ left: x, top: y, width: w, height: h }}>
      {previa && <div className="t-slot__placeholder">CÂMERA · {w}×{h}</div>}
      {/* etiqueta com tamanho fixo, presa embaixo: não estica com a moldura */}
      {nome && etiqueta !== 'nenhuma' && (
        // na direita: presa no canto de baixo à direita, nome e depois o ícone
        <div className={etiqueta === 'direita' ? 't-slot__tag t-slot__tag--direita' : 't-slot__tag'}>
          {etiqueta === 'direita' ? (
            <>
              {texto}
              {led}
            </>
          ) : (
            <>
              {led}
              {texto}
            </>
          )}
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
        <SlotCamera key={c.id} nome={c.nome} w={c.w} h={c.h} x={c.x} y={c.y - c.h} previa={previa} etiqueta={c.etiqueta} />
      ))}
    </>
  );
}
