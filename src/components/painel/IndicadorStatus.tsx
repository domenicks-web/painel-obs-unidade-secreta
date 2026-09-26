import { formatarTempoRelativo } from '../../lib/tempo';

interface Props {
  status: 'conectando' | 'ao_vivo' | 'reconectando';
  updatedAt?: string;
  updatedByNome?: string | null;
  agoraServidor: number;
}

export function IndicadorStatus({ status, updatedAt, updatedByNome, agoraServidor }: Props) {
  const cor = status === 'ao_vivo' ? 'var(--laranja)' : '#8a7f84';
  const texto = status === 'ao_vivo' ? 'AO VIVO' : status === 'reconectando' ? 'RECONECTANDO…' : 'CONECTANDO…';

  return (
    <div className="indicador-status">
      <span className="indicador-status__bolinha" style={{ background: cor }} />
      <span>{texto}</span>
      {updatedByNome && updatedAt && (
        <span className="indicador-status__editado">
          · editado por {updatedByNome} {formatarTempoRelativo(new Date(updatedAt).getTime(), agoraServidor)}
        </span>
      )}
    </div>
  );
}
