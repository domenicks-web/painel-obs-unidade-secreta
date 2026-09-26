import { useParams, useSearchParams } from 'react-router-dom';
import { useSala } from '../hooks/useSala';
import { useServerClock } from '../hooks/useServerClock';
import { useEventos } from '../hooks/useEventos';
import { calcularRestante } from '../lib/tempo';
import { Cena } from '../types/estado';
import { Comecando } from '../components/overlay/Comecando';
import { Intervalo } from '../components/overlay/Intervalo';
import { Encerramento } from '../components/overlay/Encerramento';
import { Jogo } from '../components/overlay/Jogo';
import { ReactCameras } from '../components/overlay/ReactCameras';
import { Nome } from '../components/overlay/Nome';
import { Alerta } from '../components/overlay/Alerta';

export function OverlayPage() {
  const { cena } = useParams<{ cena: Cena }>();
  const [params] = useSearchParams();
  const slug = params.get('sala') || 'principal';
  const { estado } = useSala(slug);
  const agoraServidor = useServerClock();
  const restanteMs = calcularRestante(estado, agoraServidor);
  const { ultimoEvento, recebidoEm } = useEventos(slug);
  const alertaVisivel = !!recebidoEm && agoraServidor - recebidoEm < 8000;

  return (
    <div className="palco">
      {cena === 'comecando' && <Comecando estado={estado} restanteMs={restanteMs} />}
      {cena === 'intervalo' && <Intervalo estado={estado} />}
      {cena === 'encerramento' && <Encerramento estado={estado} />}
      {cena === 'jogo' && <Jogo estado={estado} />}
      {cena === 'react' && <ReactCameras estado={estado} />}
      {cena === 'nome' && <Nome estado={estado} agoraServidor={agoraServidor} />}
      {cena === 'alerta' && <Alerta visivel={alertaVisivel} nome={ultimoEvento?.nome ?? ''} mensagem={ultimoEvento?.mensagem ?? ''} />}
    </div>
  );
}
