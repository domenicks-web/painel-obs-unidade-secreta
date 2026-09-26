import { useSearchParams } from 'react-router-dom';
import { useSala } from '../hooks/useSala';
import { useServerClock } from '../hooks/useServerClock';
import { calcularRestante } from '../lib/tempo';
import { Cena } from '../types/estado';
import { Comecando } from '../components/overlay/Comecando';
import { Intervalo } from '../components/overlay/Intervalo';
import { Encerramento } from '../components/overlay/Encerramento';
import { Jogo } from '../components/overlay/Jogo';
import { ReactCameras } from '../components/overlay/ReactCameras';
import { Nome } from '../components/overlay/Nome';
import { Alerta } from '../components/overlay/Alerta';

const CENAS: { chave: Cena; label: string }[] = [
  { chave: 'comecando', label: 'Começando' },
  { chave: 'intervalo', label: 'Intervalo' },
  { chave: 'encerramento', label: 'Encerramento' },
  { chave: 'jogo', label: 'Jogo + placar' },
  { chave: 'react', label: 'React / câmeras' },
  { chave: 'nome', label: 'Nome (lower third)' },
  { chave: 'alerta', label: 'Alerta de doação' },
];

export function PreviewPage() {
  const [params] = useSearchParams();
  const slug = params.get('sala') || 'principal';
  const { estado } = useSala(slug);
  const agoraServidor = useServerClock();
  const restanteMs = calcularRestante(estado, agoraServidor);
  const origem = window.location.origin;

  return (
    <div className="preview">
      <h1>OBS · UNIDADE SECRETA</h1>
      <div className="preview__grade">
        {CENAS.map(({ chave, label }) => (
          <div className="preview__item" key={chave}>
            <div className="preview__label">{label.toUpperCase()}</div>
            <div className="preview__palcoMini">
              <div className="palco">
                {chave === 'comecando' && <Comecando estado={estado} restanteMs={restanteMs} />}
                {chave === 'intervalo' && <Intervalo estado={estado} />}
                {chave === 'encerramento' && <Encerramento estado={estado} />}
                {chave === 'jogo' && <Jogo estado={estado} />}
                {chave === 'react' && <ReactCameras estado={estado} />}
                {chave === 'nome' && <Nome estado={estado} agoraServidor={agoraServidor} />}
                {chave === 'alerta' && <Alerta visivel nome="EXEMPLO" mensagem="Prévia do alerta" />}
              </div>
            </div>
            <div className="preview__url">{`${origem}/overlay/${chave}?sala=${slug}`}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
