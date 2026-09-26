import { Estado } from '../../types/estado';
import { Dots } from './Dots';

interface Props {
  estado: Estado;
}

export function Encerramento({ estado }: Props) {
  return (
    <div className="encerramento">
      <div className="encerramento__logo">US</div>
      <div className="encerramento__valeu">
        VALEU,
        <br />
        GALERA
      </div>
      <div className="encerramento__card">
        <div className="encerramento__cardLabel">PRÓXIMO EPISÓDIO</div>
        <div className="encerramento__proximo">{estado.proximo}</div>
        <Dots variante="acende" tamanho={22} />
      </div>
      <div className="encerramento__faixa">
        <div className="encerramento__faixaTexto">
          <span>SE INSCREVE ● ENTRA PRA RESENHA ● SE INSCREVE ● ENTRA PRA RESENHA ● SE INSCREVE ● ENTRA PRA RESENHA ● </span>
          <span>SE INSCREVE ● ENTRA PRA RESENHA ● SE INSCREVE ● ENTRA PRA RESENHA ● SE INSCREVE ● ENTRA PRA RESENHA ● </span>
        </div>
      </div>
    </div>
  );
}
