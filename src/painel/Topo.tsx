import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAgora } from '../live/relogioServidor';
import { formatarTempoRelativo } from '../live/formatar';
import type { StatusConexao } from '../live/useLive';
import type { ComandoLivePix, StatusLivePix, UltimoComando } from '../live/useControlesLivePix';
import type { StatusChat } from '../chat/useChat';

interface Props {
  status: StatusConexao;
  editadoPor: string | null;
  editadoEm: string | null;
  ehAdmin: boolean;
  aoAbrirGalera: () => void;
  livepix: StatusLivePix;
  livepixUltimo?: UltimoComando | null;
  chat: StatusChat;
}

// Os links do LivePix não dizem o estado real: o selo mostra o último comando dado.
const ROTULO_COMANDO: Record<ComandoLivePix, string> = {
  pausar: 'PAUSADO',
  retomar: 'RETOMADO',
  pular: 'PULOU',
  repetir: 'REPETIU',
  limpar: 'FILA LIMPA',
};

function extraLivePix(status: StatusLivePix, ultimo: UltimoComando | null | undefined) {
  if (status === 'erro') return 'SEM CONEXÃO';
  const rotulo = ultimo ? ROTULO_COMANDO[ultimo.comando] : '';
  if (status === 'pausado') return rotulo && rotulo !== 'PAUSADO' ? `PAUSADO · ${rotulo}` : 'PAUSADO';
  return rotulo;
}

const EXTRA_CHAT: Record<StatusChat, string> = {
  ao_vivo: '',
  teste: 'TESTE',
  conectando: 'CONECTANDO…',
  reconectando: 'RECONECTANDO…',
  sem_sessao: 'SEM SESSÃO',
};

export function Topo({ status, editadoPor, editadoEm, ehAdmin, aoAbrirGalera, livepix, livepixUltimo, chat }: Props) {
  const agora = useAgora(15000);
  const indicadores = [
    { label: 'TELAS SINCRONIZADAS', aceso: status === 'ao_vivo', extra: status === 'reconectando' ? 'RECONECTANDO…' : '' },
    {
      label: 'LIVEPIX',
      aceso: livepix === 'ativo',
      violeta: livepix === 'pausado',
      extra: extraLivePix(livepix, livepixUltimo),
      dica: livepixUltimo
        ? `Último comando: ${ROTULO_COMANDO[livepixUltimo.comando]}${livepixUltimo.por ? `, por ${livepixUltimo.por}` : ''}, ${formatarTempoRelativo(Date.parse(livepixUltimo.em), agora)}`
        : undefined,
    },
    { label: 'CHAT', aceso: chat === 'ao_vivo' || chat === 'teste', extra: EXTRA_CHAT[chat] },
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
          <div
            key={s.label}
            className={'violeta' in s && s.violeta ? 'p-status p-status--violeta' : s.aceso ? 'p-status' : 'p-status p-status--apagado'}
            title={'dica' in s ? s.dica : undefined}
          >
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
