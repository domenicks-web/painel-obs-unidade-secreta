import { useCallback, useState } from 'react';
import { useLive } from '../live/useLive';
import { RelogioServidorProvider } from '../live/relogioServidor';
import { useChat } from '../chat/useChat';
import { gravarSessao, lerSessao } from '../chat/sessao';
import { CaixaChat } from '../painel/CaixaChat';
import { ModalChatsOriginais } from '../painel/ModalChatsOriginais';
import '../painel/painel.css';

// /painel/chat: o chat do painel sozinho, pra janela separada ou dock do OBS. Mesmo ID da sessão
// do painel (guardado no navegador) e DESTACAR/TIRAR como no painel. Os apoios do YouTube quem
// grava é só o painel principal, pra não registrar duas vezes.
export function PainelChatPage() {
  return (
    <RelogioServidorProvider>
      <JanelaChat />
    </RelogioServidorProvider>
  );
}

function JanelaChat() {
  const live = useLive();
  const [sessao, setSessao] = useState(lerSessao);
  const chat = useChat({ sessao, max: 80 });
  const trocarSessao = useCallback((s: string) => {
    gravarSessao(s);
    setSessao(s);
  }, []);
  const [originais, setOriginais] = useState(false);
  const fechar = useCallback(() => setOriginais(false), []);
  return (
    <div className="p-painel p-janela-chat">
      <CaixaChat
        janela
        msgs={chat.msgs}
        status={chat.status}
        sessao={sessao}
        aoTrocarSessao={trocarSessao}
        pin={live.estado.chatPin}
        aoDestacar={(pin) => live.salvar({ chatPin: pin })}
        aoAbrirOriginais={() => setOriginais(true)}
      />
      {originais && <ModalChatsOriginais canais={live.estado.canais} aoMudar={(c) => live.salvarDepois({ canais: c })} aoFechar={fechar} />}
    </div>
  );
}
