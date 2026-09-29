import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usarFundoTransparente } from '../telas/Palco';
import { useLive } from '../live/useLive';
import type { ChatPin } from '../live/tipos';
import { useChat } from '../chat/useChat';
import { ChatOverlay, MAX_OVERLAY } from '../chat/ChatOverlay';
import { mensagemAuto, mensagemTeste } from '../chat/teste';
import { sessaoPadraoDev } from '../chat/sessao';

// /chat?sessao=ID  → fonte do OBS, fundo transparente, ocupa a fonte inteira.
// /chat?teste=1    → página de teste da referência, sem conectar em nada.
export function ChatPage() {
  const [params] = useSearchParams();
  if (params.get('teste') === '1') return <ChatTeste />;
  return <ChatAoVivo sessao={params.get('sessao') || sessaoPadraoDev()} />;
}

function ChatAoVivo({ sessao }: { sessao: string }) {
  usarFundoTransparente();
  const { estado } = useLive({ guardarLocal: true });
  const { msgs } = useChat({ sessao, max: MAX_OVERLAY });
  return (
    <div className="c-fonte">
      <ChatOverlay msgs={msgs} pin={estado.chatPin} />
    </div>
  );
}

function ChatTeste() {
  const { msgs, adicionar, limpar } = useChat({ sessao: '', max: MAX_OVERLAY, teste: true });
  const [auto, setAuto] = useState(false);
  const [pin, setPin] = useState<ChatPin | null>(null);
  const ultima = useRef(msgs[msgs.length - 1]);
  ultima.current = msgs[msgs.length - 1];

  useEffect(() => {
    const timers = [0, 1, 2, 3].map((i) => setTimeout(() => adicionar(mensagemTeste()), 250 + i * 450));
    return () => timers.forEach(clearTimeout);
  }, [adicionar]);

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => adicionar(mensagemAuto()), 1100);
    return () => clearInterval(t);
  }, [auto, adicionar]);

  function alternarDestaque() {
    const m = ultima.current;
    if (pin || !m) return setPin(null);
    setPin({ autor: m.autor, txt: m.txt, plataforma: m.plataforma });
  }

  return (
    <div className="c-teste">
      <div className="c-teste__barra">
        <div className="c-teste__titulo">CHAT US · TESTE</div>
        <button type="button" className="c-teste__botao" onClick={() => adicionar(mensagemTeste())}>
          + MENSAGEM ALEATÓRIA
        </button>
        <button type="button" className="c-teste__botao c-teste__botao--violeta" onClick={() => adicionar(mensagemTeste('super'))}>
          + SUPERCHAT
        </button>
        <button type="button" className="c-teste__botao c-teste__botao--creme" onClick={() => adicionar(mensagemTeste('membro'))}>
          + NOVO MEMBRO
        </button>
        <button type="button" className="c-teste__botao c-teste__botao--contorno" onClick={() => setAuto((a) => !a)}>
          {auto ? '■ PARAR AUTO' : '▶ AUTO'}
        </button>
        <button type="button" className="c-teste__botao c-teste__botao--contorno" onClick={alternarDestaque}>
          {pin ? 'TIRAR DESTAQUE' : '★ DESTACAR ÚLTIMA'}
        </button>
        <button type="button" className="c-teste__botao c-teste__botao--escuro" onClick={limpar}>
          LIMPAR
        </button>
      </div>
      <div className="c-teste__cena">
        <div className="c-teste__area">ÁREA DA CENA</div>
        <div className="c-teste__caixa">
          <ChatOverlay msgs={msgs} pin={pin} />
        </div>
      </div>
    </div>
  );
}
