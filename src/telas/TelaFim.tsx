import type { PropsTela } from './tipos';
import { Linha } from './Letreiro';

export function TelaFim({ estado }: PropsTela) {
  return (
    <div className="t-fim">
      <div className="t-fim__faixa">
        <div className="t-fim__letreiro">
          <Linha itens={['FIM DA LIVE', 'VALEU']} repeticoes={3} />
        </div>
      </div>
      <div className="t-fim__listra" />
      <div className="t-fim__conteudo">
        <div className="t-fim__texto">
          <div className="t-fim__valeu">VALEU, RAPAZIADA</div>
          <div className="t-fim__ate">
            ATÉ A<br />
            PRÓXIMA
          </div>
        </div>
        <div className="t-fim__cartao">
          <div className="t-fim__rotulo">PRÓXIMA LIVE</div>
          <div className="t-fim__proximo">{estado.proximo}</div>
          <div className="t-fim__inscreve">SE INSCREVE E ATIVA O SININHO</div>
          <div className="t-fim__bolinhas">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="t-fim__bolinha" style={{ animationDelay: `${i * 0.4}s` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
