import { useAgora } from '../live/relogioServidor';
import { bolinhasCheias, mmss, segundosRestantes } from '../live/relogios';

interface Props {
  minutos: number;
  timerInicio: number | null;
  className?: string;
}

export function Countdown({ minutos, timerInicio, className }: Props) {
  const agora = useAgora(250);
  return <div className={className}>{mmss(segundosRestantes(minutos, timerInicio, agora))}</div>;
}

// 10 bolinhas da Início (Telas Live linhas 61-65): cheias em tinta, a atual creme pulsando.
export function BolinhasProgresso({ minutos, timerInicio }: Omit<Props, 'className'>) {
  const agora = useAgora(1000);
  const total = Math.max(1, minutos * 60);
  const cheias = bolinhasCheias(segundosRestantes(minutos, timerInicio, agora), total);
  return (
    <div className="t-inicio__bolinhas">
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          className="t-inicio__bolinha"
          style={{
            background: i < cheias ? '#1A1417' : i === cheias ? '#FFF3E0' : 'transparent',
            animation: i === cheias ? 'usPulse 1s ease-in-out infinite' : 'none',
          }}
        />
      ))}
    </div>
  );
}
