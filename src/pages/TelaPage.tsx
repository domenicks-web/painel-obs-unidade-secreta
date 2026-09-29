import { useParams, useSearchParams } from 'react-router-dom';
import { Palco, usarFundoTransparente } from '../telas/Palco';
import { TELA_COMPONENTE } from '../telas';
import { useLive } from '../live/useLive';
import { RelogioServidorProvider } from '../live/relogioServidor';
import { ESTADO_REFERENCIA } from '../live/fixture';
import type { EstadoLive, TelaId } from '../live/tipos';

export function TelaPage() {
  const { id } = useParams<{ id: TelaId }>();
  const [params] = useSearchParams();
  const fixture = params.get('fixture') === 'referencia' ? ESTADO_REFERENCIA : undefined;
  return (
    <RelogioServidorProvider fixo={!!fixture}>
      <TelaAoVivo id={id} fixture={fixture} />
    </RelogioServidorProvider>
  );
}

function TelaAoVivo({ id, fixture }: { id?: TelaId; fixture?: EstadoLive }) {
  usarFundoTransparente();
  const { estado } = useLive({ fixture });
  const Tela = id ? TELA_COMPONENTE[id] : undefined;
  return <Palco>{Tela && <Tela estado={estado} />}</Palco>;
}
