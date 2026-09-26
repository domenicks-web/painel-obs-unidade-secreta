import { Estado } from '../../types/estado';
import { Dots } from './Dots';

interface Props {
  estado: Estado;
}

export function ReactCameras({ estado }: Props) {
  return (
    <>
      <div className="reactCameras__moldura" />
      {estado.cams.slice(0, 3).map((nome, i) => (
        <div className="reactCameras__cam" style={{ top: 40 + i * 286 }} key={i}>
          <div className="reactCameras__camLabel">
            <div className="reactCameras__camBolinha" />
            {nome}
          </div>
        </div>
      ))}
      <div className="reactCameras__rodape">
        <div className="reactCameras__rodapeLogo">US</div>
        <div className="reactCameras__rodapeLabel">REACT</div>
        <div className="reactCameras__rodapeTitulo">{estado.titulo}</div>
        <Dots variante="acende" tamanho={18} />
      </div>
    </>
  );
}
