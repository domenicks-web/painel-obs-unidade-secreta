import { Estado } from '../../types/estado';
import { formatRelogio } from '../../lib/tempo';
import { Dots } from './Dots';

interface Props {
  estado: Estado;
  restanteMs: number;
}

export function Comecando({ estado, restanteMs }: Props) {
  const acabou = !!estado.fim && restanteMs === 0;
  const relogio = acabou ? 'JÁ' : formatRelogio(restanteMs);
  const label = acabou ? 'VAI COMEÇAR' : 'A TRANSMISSÃO COMEÇA EM';

  return (
    <div className="comecando">
      <div className="comecando__logoWrap">
        <div className="comecando__logo">US</div>
      </div>
      <div className="comecando__info">
        <div className="comecando__label">{label}</div>
        <div className="comecando__relogio">{relogio}</div>
        <div className="comecando__titulo">{estado.titulo}</div>
        <Dots variante="acende" />
      </div>
      <div className="comecando__faixa">
        <div className="comecando__faixaTexto">
          <span>UNIDADE SECRETA ● RESENHA ● AO VIVO ● UNIDADE SECRETA ● RESENHA ● AO VIVO ● UNIDADE SECRETA ● RESENHA ● AO VIVO ● </span>
          <span>UNIDADE SECRETA ● RESENHA ● AO VIVO ● UNIDADE SECRETA ● RESENHA ● AO VIVO ● UNIDADE SECRETA ● RESENHA ● AO VIVO ● </span>
        </div>
      </div>
    </div>
  );
}
