import { CampoTexto } from './CampoTexto';
import { Modal } from './Modal';
import { abrirJanela, CANAIS_VAZIOS, NOME_PLATAFORMA, urlChatOriginal, type Canais } from '../chat/canais';
import { PLATAFORMAS, type Plataforma } from '../chat/tipos';

const DICA: Record<Plataforma, string> = {
  yt: 'LINK DA LIVE (abre só o chat) ou @ do canal',
  tw: 'canal ou link',
  kk: 'canal ou link',
  tt: '@ ou link (abre a live, o TikTok não tem chat solto)',
};

interface Props {
  canais: Canais | undefined;
  aoMudar: (c: Canais) => void;
  aoFechar: () => void;
}

// Reserva do chat: os chats originais de cada plataforma, cada um na sua janela. Não passa pelo
// Social Stream Ninja nem pelo ID da sessão; os canais ficam salvos pra todo mundo da equipe.
export function ModalChatsOriginais({ canais, aoMudar, aoFechar }: Props) {
  const atual = { ...CANAIS_VAZIOS, ...canais };
  return (
    <Modal titulo="CHATS ORIGINAIS" extra="RESERVA, SEM O SSN" aoFechar={aoFechar}>
      <div className="p-originais">
        {(Object.keys(PLATAFORMAS) as Plataforma[]).map((p) => {
          const url = urlChatOriginal(p, atual[p]);
          return (
            <div key={p} className="p-originais__linha">
              <div className="p-chat__tag p-originais__tag" style={{ background: PLATAFORMAS[p].cor }}>
                {PLATAFORMAS[p].tag}
              </div>
              <CampoTexto rotulo={`${NOME_PLATAFORMA[p]} · ${DICA[p]}`} className="p-input p-originais__input" valor={atual[p]} aoMudar={(v) => aoMudar({ ...atual, [p]: v })} />
              <button type="button" className="p-pix__add p-originais__abrir" disabled={!url} onClick={() => url && abrirJanela(url, `us-chat-${p}`)}>
                ABRIR
              </button>
            </div>
          );
        })}
        <div className="p-chat__sessao-dica">Cada chat abre numa janela. Fica salvo pra toda a equipe, em qualquer PC.</div>
      </div>
    </Modal>
  );
}
