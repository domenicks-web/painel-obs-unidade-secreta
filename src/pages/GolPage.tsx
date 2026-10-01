import { Palco, usarFundoTransparente } from '../telas/Palco';
import { useLive } from '../live/useLive';
import { RelogioServidorProvider } from '../live/relogioServidor';
import { CamadaGol } from '../gol/CamadaGol';

// /gol → fonte do OBS 1920×1080, transparente, por cima de tudo na cena FUTEBOL (acima das câmeras).
// Toca a animação (e o apito, se a chave SOM DO GOL estiver ligada) quando sai gol no painel.
export function GolPage() {
  return (
    <RelogioServidorProvider>
      <GolAoVivo />
    </RelogioServidorProvider>
  );
}

function GolAoVivo() {
  usarFundoTransparente();
  const { estado } = useLive({ guardarLocal: true });
  return (
    <Palco>
      <CamadaGol estado={estado} comSom />
    </Palco>
  );
}
