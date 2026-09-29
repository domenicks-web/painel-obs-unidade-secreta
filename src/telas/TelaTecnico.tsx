import type { PropsTela } from './tipos';
import { Linha } from './Letreiro';

export function TelaTecnico(_: PropsTela) {
  return (
    <div className="t-tecnico">
      <div className="t-tecnico__listra" />
      <div className="t-tecnico__faixa">
        <div className="t-tecnico__letreiro">
          <Linha itens={['PROBLEMAS TÉCNICOS', 'AGUENTA AÍ']} repeticoes={2} />
        </div>
      </div>
      <div className="t-tecnico__cartao">
        <div className="t-tecnico__glitch">
          <div className="t-tecnico__glitch-a">DEU RUIM</div>
          <div className="t-tecnico__glitch-b">DEU RUIM</div>
          <div className="t-tecnico__glitch-c">DEU RUIM</div>
        </div>
        <div className="t-tecnico__volta">JÁ JÁ A GENTE VOLTA</div>
      </div>
      <div className="t-tecnico__scan" />
    </div>
  );
}
