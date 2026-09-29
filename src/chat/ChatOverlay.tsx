import type { CSSProperties } from 'react';
import type { ChatPin } from '../live/tipos';
import { corNoOverlay, ehPlataforma, PLATAFORMAS, type MsgChat, type Plataforma } from './tipos';
import './chat.css';

/** Últimas mensagens que cabem na caixa (as de cima saem pela borda). */
export const MAX_OVERLAY = 9;

const cor = (c: string) => ({ '--cor': c }) as CSSProperties;

function ChipPlataforma({ p }: { p: Plataforma }) {
  return (
    <span className="c-chip" style={cor(PLATAFORMAS[p].cor)}>
      {PLATAFORMAS[p].tag}
    </span>
  );
}

function Mensagem({ m }: { m: MsgChat }) {
  if (m.tipo === 'super') {
    return (
      <div className="c-super">
        <div className="c-super__listra" />
        <div className="c-super__corpo">
          <div className="c-super__topo">
            <div className="c-super__nome">
              <ChipPlataforma p={m.plataforma} />
              {m.autor}
            </div>
            <div className="c-super__valor">{m.valor}</div>
          </div>
          {m.txt && <div className="c-super__txt">{m.txt}</div>}
        </div>
      </div>
    );
  }
  if (m.tipo === 'membro') {
    return (
      <div className="c-membro">
        <div className="c-membro__bolinhas">
          {Array.from({ length: 10 }, (_, k) => (
            <div key={k} className={k === 9 ? 'c-membro__bolinha c-membro__bolinha--creme' : 'c-membro__bolinha'} style={{ animationDelay: `${0.15 + k * 0.03}s` }} />
          ))}
        </div>
        <div className="c-membro__textos">
          <div className="c-membro__rotulo">NOVO MEMBRO DA UNIDADE</div>
          <div className="c-membro__nome">{m.autor}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="c-msg" style={cor(corNoOverlay(m.autor))}>
      <div className="c-msg__nome">
        <ChipPlataforma p={m.plataforma} />
        {m.mod && <span className="c-msg__mod">MOD</span>}
        {m.membro && <span className="c-msg__membro" />}
        {m.autor}
      </div>
      <div className="c-msg__txt">{m.txt}</div>
    </div>
  );
}

function Destaque({ pin }: { pin: ChatPin }) {
  return (
    <div className="c-pin">
      <div className="c-pin__rotulo">
        EM DESTAQUE
        {ehPlataforma(pin.plataforma) && <ChipPlataforma p={pin.plataforma} />}
      </div>
      <div className="c-pin__nome">{pin.autor}</div>
      <div className="c-pin__txt">{pin.txt}</div>
    </div>
  );
}

export function ChatOverlay({ msgs, pin }: { msgs: MsgChat[]; pin: ChatPin | null }) {
  return (
    <div className="c-chat">
      {pin && <Destaque key={`${pin.autor}|${pin.txt}`} pin={pin} />}
      <div className="c-chat__lista">
        {msgs.slice(-MAX_OVERLAY).map((m) => (
          <Mensagem key={m.id} m={m} />
        ))}
      </div>
      <div className="c-chat__faixa" />
    </div>
  );
}
