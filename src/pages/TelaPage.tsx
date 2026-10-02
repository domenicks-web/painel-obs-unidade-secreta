import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Palco, usarFundoTransparente } from '../telas/Palco';
import { TELA_COMPONENTE } from '../telas';
import { useLive } from '../live/useLive';
import { RelogioServidorProvider } from '../live/relogioServidor';
import { ESTADO_REFERENCIA, escalacaoDaUrl } from '../live/fixture';
import { TimesProvider } from '../escalacao/useTimes';
import { TIMES_EXEMPLO } from '../escalacao/exemplo';
import type { EstadoLive, TelaId } from '../live/tipos';

export function TelaPage() {
  const { id } = useParams<{ id: TelaId }>();
  const [params] = useSearchParams();
  const ehFixture = params.get('fixture') === 'referencia';
  // com fixture, a ESCALAÇÃO aceita os casos da referência pela URL (?esc=campo,ambos,6,...)
  const textoEsc = params.get('esc');
  const fixture = useMemo(() => (ehFixture ? { ...ESTADO_REFERENCIA, ...escalacaoDaUrl(textoEsc) } : undefined), [ehFixture, textoEsc]);
  const tela = (
    <RelogioServidorProvider fixo={!!fixture}>
      <TelaAoVivo id={id} fixture={fixture} />
    </RelogioServidorProvider>
  );
  // só a ESCALAÇÃO lê o cadastro de times (as outras telas não abrem essa inscrição)
  if (id !== 'escalacao') return tela;
  return (
    <TimesProvider fixo={fixture ? TIMES_EXEMPLO : undefined} guardarLocal>
      {tela}
    </TimesProvider>
  );
}

function TelaAoVivo({ id, fixture }: { id?: TelaId; fixture?: EstadoLive }) {
  usarFundoTransparente();
  const { estado } = useLive({ fixture, guardarLocal: true });
  const Tela = id ? TELA_COMPONENTE[id] : undefined;
  return <Palco>{Tela && <Tela estado={estado} />}</Palco>;
}
