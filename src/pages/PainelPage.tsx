import { useSearchParams } from 'react-router-dom';
import { useSala } from '../hooks/useSala';
import { useServerClock } from '../hooks/useServerClock';
import { calcularRestante } from '../lib/tempo';
import { IndicadorStatus } from '../components/painel/IndicadorStatus';
import { SecaoComecando } from '../components/painel/SecaoComecando';
import { SecaoIntervalo } from '../components/painel/SecaoIntervalo';
import { SecaoEncerramento } from '../components/painel/SecaoEncerramento';
import { SecaoPlacar } from '../components/painel/SecaoPlacar';

export function PainelPage() {
  const [params] = useSearchParams();
  const slug = params.get('sala') || 'principal';
  const { estado, status, updatedAt, updatedByNome, atualizar } = useSala(slug);
  const agoraServidor = useServerClock();
  const restanteMs = calcularRestante(estado, agoraServidor);

  return (
    <div className="painel">
      <header className="painel__cabecalho">
        <div className="painel__logo">US</div>
        <h1>PAINEL AO VIVO</h1>
      </header>
      <IndicadorStatus status={status} updatedAt={updatedAt} updatedByNome={updatedByNome} agoraServidor={agoraServidor} />
      <SecaoComecando estado={estado} restanteMs={restanteMs} atualizar={atualizar} />
      <SecaoIntervalo estado={estado} atualizar={atualizar} />
      <SecaoEncerramento estado={estado} atualizar={atualizar} />
      <SecaoPlacar estado={estado} atualizar={atualizar} />
    </div>
  );
}
