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
          <LogoFlutuando />
        </div>
      </div>
      <div className="t-inicio__listra" />
    </div>
  );
}

// O logo gira e flutua dentro do SVG (animateTransform), não com animação CSS no elemento:
// animação CSS de transform vira uma camada à parte que o OBS gira sem suavizar a borda (serrilhado).
// Aqui o SVG fica parado e a rotação é desenhada já suavizada. Mesmo movimento do antigo usFloat (rotate -4°→3°, sobe 18px, 6 s).
const SUAVE = { keyTimes: '0;0.5;1', calcMode: 'spline', keySplines: '.42 0 .58 1;.42 0 .58 1', dur: '6s', repeatCount: 'indefinite' } as const;

function LogoFlutuando() {
  return (
    <svg className="t-inicio__logo-svg" width={620} height={640} viewBox="-60 -70 620 640" aria-hidden="true">
      <g>
        <animateTransform attributeName="transform" type="rotate" values="-4 250 250;3 250 250;-4 250 250" {...SUAVE} />
        <g>
          <animateTransform attributeName="transform" type="translate" values="0 0;0 -18;0 0" {...SUAVE} />
          <rect x={18} y={18} width={500} height={500} fill="#FFF3E0" />
          <rect x={0} y={0} width={500} height={500} fill="#1A1417" />
          <foreignObject x={0} y={0} width={500} height={500}>
            <div className="t-inicio__logo-miolo">
              <div className="t-inicio__us">US</div>
              <div className="t-inicio__grade">
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} />
                ))}
              </div>
            </div>
          </foreignObject>
        </g>
      </g>
    </svg>
  );
}
