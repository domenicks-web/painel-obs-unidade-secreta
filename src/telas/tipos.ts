import type { EstadoLive } from '../live/tipos';

export interface PropsTela {
  estado: EstadoLive;
  // prévia do painel: mostra os textos de placeholder (CÂMERA · W×H, CHAT, QR CODE)
  previa?: boolean;
}
