export function SeloAoVivo({ className = '' }: { className?: string }) {
  return (
    <div className={`t-aovivo ${className}`}>
      <div className="t-aovivo__led" />
      <div className="t-aovivo__txt">AO VIVO</div>
    </div>
  );
}

// Área do chat: no OBS fica só a moldura (o chat entra por cima como fonte); o texto aparece só na prévia.
export function CaixaChat({ x, y, w, h, previa }: { x: number; y: number; w: number; h: number; previa?: boolean }) {
  return (
    <div className="t-chat" style={{ left: x, top: y, width: w, height: h }}>
      <div className="t-chat__rotulo">CHAT AO VIVO</div>
      {previa && (
        <div className="t-chat__placeholder">
          CHAT · {w}×{h}
        </div>
      )}
    </div>
  );
}
