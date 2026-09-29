import { useAgora } from '../live/relogioServidor';
import { segundosJogo } from '../live/relogios';
import type { EstadoLive } from '../live/tipos';

type Relogio = Pick<EstadoLive, 'clockInicio' | 'clockAcumulado' | 'clockRodando'>;

export function RelogioJogo({ estado, className }: { estado: Relogio; className?: string }) {
  const agora = useAgora(1000);
  return <div className={className}>{Math.floor(segundosJogo(estado, agora) / 60)}'</div>;
}
