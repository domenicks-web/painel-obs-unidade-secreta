import type { PropsTela } from './tipos';
import { Linha } from './Letreiro';
import { BolinhasProgresso, Countdown } from './Countdown';

// letreiros gigantes do fundo: [texto, repetições por metade, animação]
const LINHAS: [string, number, string][] = [
  ['UNIDADE SECRETA', 2, 'usMarq 26s linear infinite'],
  ['AO VIVO', 4, 'usMarqR 30s linear infinite'],
  ['SINAL ABERTO', 4, 'usMarq 22s linear infinite'],
  ['UNIDADE SECRETA', 2, 'usMarqR 28s linear infinite'],
  ['AO VIVO', 4, 'usMarq 24s linear infinite'],
  ['SINAL ABERTO', 4, 'usMarqR 32s linear infinite'],
];

export function TelaInicio({ estado }: PropsTela) {
  return (
    <div className="t-inicio">
      <div className="t-inicio__fundo">
        {LINHAS.map(([texto, rep, animacao], i) => (
          <div key={i} className="t-inicio__linha" style={{ animation: animacao }}>
            <Linha itens={[texto]} repeticoes={rep} />
          </div>
        ))}
      </div>
      <div className="t-inicio__conteudo">
        <div className="t-inicio__texto">
          <div className="t-inicio__chamada">A LIVE JÁ VAI COMEÇAR</div>
          <div className="t-inicio__titulo">{estado.titulo}</div>
          <div className="t-inicio__contagem">
            <Countdown className="t-inicio__relogio" minutos={estado.minutos} timerInicio={estado.timerInicio} />
            <BolinhasProgresso minutos={estado.minutos} timerInicio={estado.timerInicio} />
          </div>
        </div>
        <div className="t-inicio__logo">
          <div className="t-inicio__us">US</div>
          <div className="t-inicio__grade">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} />
            ))}
          </div>
        </div>
      </div>
      <div className="t-inicio__listra" />
    </div>
  );
}
