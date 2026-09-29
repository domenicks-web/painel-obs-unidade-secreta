import { useCallback, useState } from 'react';
import { useLive } from '../live/useLive';
import { useAuth } from '../hooks/useAuth';
import { RelogioServidorProvider } from '../live/relogioServidor';
import { TELAS, type TelaId } from '../live/tipos';
import { Topo } from '../painel/Topo';
import { ListaTelas } from '../painel/ListaTelas';
import { Previa } from '../painel/Previa';
import { CampoTexto } from '../painel/CampoTexto';
import { CamposTela } from '../painel/CamposTela';
import { ColunaPix } from '../painel/ColunaPix';
import { CaixaChat } from '../painel/CaixaChat';
import { ModalGalera } from '../painel/ModalGalera';
import { usePix } from '../live/usePix';
import { useControlesLivePix } from '../live/useControlesLivePix';
import '../painel/painel.css';

export function PainelPage() {
  return (
    <RelogioServidorProvider>
      <Painel />
    </RelogioServidorProvider>
  );
}

function Painel() {
  const live = useLive();
  const pix = usePix();
  const livepix = useControlesLivePix();
  const { papel } = useAuth();
  const [tela, setTela] = useState<TelaId>('host');
  const [galeraAberta, setGaleraAberta] = useState(false);
  const fecharGalera = useCallback(() => setGaleraAberta(false), []);
  const { estado, salvarDepois } = live;
  const label = TELAS.find((t) => t.id === tela)!.label;

  return (
    <div className="p-painel">
      <Topo
        status={live.status}
        editadoPor={live.editadoPor}
        editadoEm={live.editadoEm}
        ehAdmin={papel === 'admin'}
        aoAbrirGalera={() => setGaleraAberta(true)}
        livepix={livepix.status}
        livepixUltimo={livepix.ultimo}
      />
      <div className="p-grade">
        <ListaTelas atual={tela} aoEscolher={setTela} />
        <main className="p-centro">
          <div className="p-previa-bloco">
            <div className="p-previa-cabeca">
              <div className="p-previa-titulo">{label}</div>
              <div className="p-previa-aviso">PRÉVIA · NÃO É O QUE ESTÁ NO AR</div>
            </div>
            <Previa tela={tela} estado={estado} />
          </div>
          <section className="p-infos">
            <div className="p-infos-cabeca">
              <div className="p-selo">INFOS DA TELA</div>
              <div className="p-infos-sub">ATUALIZA NO OBS NA HORA</div>
            </div>
            <CamposTela tela={tela} live={live} />
            <div className="p-divisor" />
            <div className="p-duas">
              <CampoTexto rotulo="TÍTULO DA LIVE · TODAS AS CENAS" valor={estado.titulo} maiusculo aoMudar={(v) => salvarDepois({ titulo: v })} />
              <CampoTexto rotulo="LETREIRO · SEPARA COM ●" valor={estado.ticker} maiusculo aoMudar={(v) => salvarDepois({ ticker: v })} />
            </div>
          </section>
        </main>
        <aside className="p-direita">
          <ColunaPix live={live} pix={pix} livepix={livepix} />
          <CaixaChat />
        </aside>
      </div>
      {galeraAberta && <ModalGalera galera={estado.galera} aoSalvar={(g) => salvarDepois({ galera: g })} aoFechar={fecharGalera} />}
    </div>
  );
}
