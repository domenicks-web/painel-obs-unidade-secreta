import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLive } from '../live/useLive';
import { useAuth } from '../hooks/useAuth';
import { RelogioServidorProvider } from '../live/relogioServidor';
import { TELAS, type TelaId } from '../live/tipos';
import { Topo } from '../painel/Topo';
import { ListaTelas } from '../painel/ListaTelas';
import { Previa } from '../painel/Previa';
import { FilaAlertas } from '../painel/FilaAlertas';
import { usePlaylistAlertas } from '../alerta/remoto';
import { camerasDaTela, ehTelaCam, patchCams } from '../telas/cameras';
import { CampoTexto } from '../painel/CampoTexto';
import { CamposTela } from '../painel/CamposTela';
import { ColunaPix } from '../painel/ColunaPix';
import { CaixaChat } from '../painel/CaixaChat';
import { ModalGalera } from '../painel/ModalGalera';
import { useApoios } from '../live/useApoios';
import { useControlesLivePix } from '../live/useControlesLivePix';
import { useChat } from '../chat/useChat';
import { gravarSessao, lerSessao } from '../chat/sessao';
import { mensagemAuto } from '../chat/teste';
import { useGravarApoiosYouTube } from '../apoios/youtube';
import { ModalTimes } from '../painel/ModalTimes';
import type { CenaFutebol } from '../painel/CamposTela';
import { ConfirmarProvider } from '../painel/Confirmar';
import { TimesProvider, useTimes } from '../escalacao/useTimes';
import { modoEsc, timesEscalados } from '../telas/TelaEscalacao';
import '../painel/painel.css';

export function PainelPage() {
  return (
    <RelogioServidorProvider>
      <TimesProvider>
        <ConfirmarProvider>
          <Painel />
        </ConfirmarProvider>
      </TimesProvider>
    </RelogioServidorProvider>
  );
}

function Painel() {
  const live = useLive();
  const pix = useApoios();
  const livepix = useControlesLivePix();
  const playlist = usePlaylistAlertas();
  const { papel } = useAuth();
  const [params] = useSearchParams();
  const chatTeste = params.get('chatTeste') === '1';
  const [sessao, setSessao] = useState(lerSessao);
  const chat = useChat({ sessao, max: 40, teste: chatTeste });
  const { adicionar } = chat;
  // superchat, sticker e membro novo do YouTube viram apoio (nunca no modo teste)
  useGravarApoiosYouTube(chat.msgs, chat.status !== 'teste');
  const trocarSessao = useCallback((s: string) => {
    gravarSessao(s);
    setSessao(s);
  }, []);
  const [tela, setTela] = useState<TelaId>('host');
  const [galeraAberta, setGaleraAberta] = useState(false);
  const fecharGalera = useCallback(() => setGaleraAberta(false), []);
  // aberto: { nome } abre direto no time com esse nome (ou num novo); {} abre a lista
  const [timesAberto, setTimesAberto] = useState<{ nome?: string } | null>(null);
  const fecharTimes = useCallback(() => setTimesAberto(null), []);
  const { times } = useTimes();
  const [editandoPosicoes, setEditandoPosicoes] = useState(false);
  // o editor de posições só vale na ESCALAÇÃO em modo CAMPO
  // FUTEBOL e ESCALAÇÃO são um item só no painel: cena = qual das duas a prévia e as câmeras mostram
  const [cena, setCena] = useState<CenaFutebol>('futebol');
  const telaPrevia: TelaId = tela === 'futebol' ? cena : tela;
  const posicoesAtivas = editandoPosicoes && telaPrevia === 'escalacao' && modoEsc(live.estado.escModo) === 'campo';
  const editarPosicoes = useCallback((v: boolean) => {
    setEditandoPosicoes(v);
    if (v) setCena('escalacao');
  }, []);
  const { estado, salvarDepois } = live;
  const label = TELAS.find((t) => t.id === tela)!.label;

  // /painel?chatTeste=1: mensagens fictícias a cada 2,6 s (demonstração e prints)
  useEffect(() => {
    if (!chatTeste) return;
    for (let i = 0; i < 5; i++) adicionar(mensagemAuto());
    const t = setInterval(() => adicionar(mensagemAuto()), 2600);
    return () => clearInterval(t);
  }, [chatTeste, adicionar]);

  return (
    <div className="p-painel">
      <Topo
        status={live.status}
        editadoPor={live.editadoPor}
        editadoEm={live.editadoEm}
        ehAdmin={papel === 'admin'}
        aoAbrirGalera={() => setGaleraAberta(true)}
        aoAbrirTimes={() => setTimesAberto({})}
        livepix={livepix.status}
        livepixUltimo={livepix.ultimo}
        chat={chat.status}
        erro={live.erro}
        aoFecharErro={live.fecharErro}
      />
      <div className="p-grade">
        <ListaTelas atual={tela} aoEscolher={setTela} />
        <main className="p-centro">
          <div className="p-previa-bloco">
            <div className="p-previa-cabeca">
              <div className="p-previa-titulo">{label}</div>
              {tela === 'futebol' && (
                <div className="p-cena" role="group" aria-label="CENA DA PRÉVIA">
                  {(['futebol', 'escalacao'] as const).map((c) => (
                    <button key={c} type="button" className={cena === c ? 'p-cena__botao p-cena__botao--ativa' : 'p-cena__botao'} aria-pressed={cena === c} onClick={() => setCena(c)}>
                      {c === 'futebol' ? 'FUTEBOL' : 'ESCALAÇÃO'}
                    </button>
                  ))}
                </div>
              )}
              <div className="p-previa-aviso">PRÉVIA · NÃO É O QUE ESTÁ NO AR</div>
            </div>
            <Previa
              tela={telaPrevia}
              estado={estado}
              editor={
                ehTelaCam(telaPrevia)
                  ? { lista: camerasDaTela(estado, telaPrevia), aoMudar: (l) => live.salvarDepois(patchCams(telaPrevia, l)) }
                  : undefined
              }
              jogadores={
                posicoesAtivas
                  ? {
                      escalados: timesEscalados(estado, times),
                      aoMudar: (lado, pontos) => salvarDepois(lado === 'casa' ? { escPosCasa: pontos } : { escPosVisit: pontos }),
                    }
                  : undefined
              }
            />
          </div>
          <section className="p-infos">
            <div className="p-infos-cabeca">
              <div className="p-selo">INFOS DA TELA</div>
              <div className="p-infos-sub">ATUALIZA NO OBS NA HORA</div>
            </div>
            <CamposTela
              tela={tela}
              live={live}
              escalacao={{ cena, aoTrocarCena: setCena, editandoPosicoes: posicoesAtivas, aoEditarPosicoes: editarPosicoes, aoAbrirTimes: (nome) => setTimesAberto({ nome }) }}
            />
            <div className="p-divisor" />
            <div className="p-duas">
              <CampoTexto rotulo="TÍTULO DA LIVE · TODAS AS CENAS" valor={estado.titulo} maiusculo aoMudar={(v) => salvarDepois({ titulo: v })} />
              <CampoTexto rotulo="LETREIRO · SEPARA COM ●" valor={estado.ticker} maiusculo aoMudar={(v) => salvarDepois({ ticker: v })} />
            </div>
          </section>
        </main>
        <aside className="p-direita">
          <ColunaPix live={live} pix={pix} livepix={livepix} />
          <FilaAlertas playlist={playlist} />
          <CaixaChat
            msgs={chat.msgs}
            status={chat.status}
            sessao={sessao}
            aoTrocarSessao={trocarSessao}
            pin={estado.chatPin}
            aoDestacar={(pin) => live.salvar({ chatPin: pin })}
          />
        </aside>
      </div>
      {timesAberto && <ModalTimes aoFechar={fecharTimes} abrirNome={timesAberto.nome} />}
      {galeraAberta && <ModalGalera galera={estado.galera} aoSalvar={(g) => salvarDepois({ galera: g })} aoFechar={fecharGalera} />}
    </div>
  );
}
