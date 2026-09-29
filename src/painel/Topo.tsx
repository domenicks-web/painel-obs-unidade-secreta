import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAgora } from '../live/relogioServidor';
import { formatarTempoRelativo } from '../live/formatar';
import type { StatusConexao } from '../live/useLive';

interface Props {
  status: StatusConexao;
  editadoPor: string | null;
  editadoEm: string | null;
  ehAdmin: boolean;
  aoAbrirGalera: () => void;
}

export function Topo({ status, editadoPor, editadoEm, ehAdmin, aoAbrirGalera }: Props) {
  const agora = useAgora(15000);
  const indicadores = [
    { label: 'TELAS SINCRONIZADAS', aceso: status === 'ao_vivo', extra: status === 'reconectando' ? 'RECONECTANDO…' : '' },
    { label: 'LIVEPIX', aceso: false, extra: 'EM BREVE' },
    { label: 'CHAT', aceso: false, extra: 'EM BREVE' },
  ];

  return (
    <header className="p-topo">
      <div className="p-topo__us">US</div>
      <div className="p-topo__titulo">PAINEL DA LIVE</div>
      <div className="p-topo__barra" />
      <div className="p-topo__sub">INFOS DAS TELAS · A TROCA DE CENA É NO OBS</div>
      <div className="p-topo__direita">
        {editadoPor && editadoEm && (
          <div className="p-topo__editado">
            editado por {editadoPor} {formatarTempoRelativo(Date.parse(editadoEm), agora)}
          </div>
        )}
        {indicadores.map((s) => (
          <div key={s.label} className={s.aceso ? 'p-status' : 'p-status p-status--apagado'}>
            <div className={s.aceso ? 'p-status__led p-status__led--aceso' : 'p-status__led'} />
            <div className="p-status__label">{s.label}</div>
            {s.extra && <div className="p-status__extra">{s.extra}</div>}
          </div>
        ))}
        <button type="button" className="p-topo__botao p-topo__botao--galera" onClick={aoAbrirGalera}>
          GALERA
        </button>
        {ehAdmin && (
          <Link to="/admin" className="p-topo__botao">
            ADMIN
          </Link>
        )}
        <button type="button" className="p-topo__botao" onClick={() => supabase.auth.signOut()}>
          SAIR
        </button>
      </div>
    </header>
  );
}
