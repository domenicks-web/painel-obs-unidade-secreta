interface Props {
  nome: string;
  w: number;
  h: number;
  x: number;
  y: number;
  previa?: boolean;
  /** etiqueta no canto de baixo, dentro do quadro (quando não cabe embaixo) */
  etiquetaDentro?: boolean;
}

export function SlotCamera({ nome, w, h, x, y, previa, etiquetaDentro }: Props) {
  return (
    <div className="t-slot" style={{ left: x, top: y, width: w, height: h }}>
      {previa && <div className="t-slot__placeholder">CÂMERA · {w}×{h}</div>}
      <div className={etiquetaDentro ? 't-slot__tag t-slot__tag--dentro' : 't-slot__tag'}>
        <div className="t-slot__led-box">
          <div className="t-slot__led" />
        </div>
        <div className="t-slot__nome">{nome}</div>
      </div>
    </div>
  );
}
