import type { PropsTela } from './tipos';
import { Countdown } from './Countdown';

export function TelaIntervalo({ estado }: PropsTela) {
  return (
    <div className="t-intervalo">
      <div className="t-intervalo__giro" />
      <div className="t-intervalo__listra t-intervalo__listra--topo" />
      <div className="t-intervalo__listra t-intervalo__listra--base" />
      <div className="t-intervalo__centro">
        <div className="t-intervalo__selo">INTERVALO</div>
        <div className="t-intervalo__frase">
          {estado.msg.split('').map((ch, i) => (
            <span
              key={i}
              className="t-intervalo__letra"
              style={{ minWidth: ch === ' ' ? '0.4em' : 0, animationDelay: `${i * 0.08}s` }}
            >
              {ch === ' ' ? ' ' : ch}
            </span>
          ))}
        </div>
        <div className="t-intervalo__volta">
          <div className="t-intervalo__volta-rotulo">VOLTA EM</div>
          <Countdown className="t-intervalo__relogio" minutos={estado.minutos} timerInicio={estado.timerInicio} />
        </div>
      </div>
    </div>
  );
}
