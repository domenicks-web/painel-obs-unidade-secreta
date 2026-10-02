import { useAgora } from '../live/relogioServidor';
import { mmss, segundosJogo } from '../live/relogios';
import type { EstadoLive } from '../live/tipos';

type Relogio = Pick<EstadoLive, 'clockInicio' | 'clockAcumulado' | 'clockRodando'>;

/** Tempo completo do jogo (67:23). Da prorrogação pra frente (100+ min) a fonte diminui pra caber. */
export function RelogioJogo({ estado, className }: { estado: Relogio; className?: string }) {
  const agora = useAgora(1000);
  const seg = segundosJogo(estado, agora);
  return (
    <div className={className} style={seg >= 6000 ? { fontSize: 40 } : undefined}>
      {mmss(seg)}
    </div>
  );
}
