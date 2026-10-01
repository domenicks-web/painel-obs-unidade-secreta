import { useState, type CSSProperties, type FormEvent } from 'react';
import type { ChatPin } from '../live/tipos';
import type { StatusChat } from '../chat/useChat';
import { corNoPainel, PLATAFORMAS, type MsgChat, type Plataforma } from '../chat/tipos';

interface Props {
  msgs: MsgChat[];
  status: StatusChat;
  sessao: string;
  aoTrocarSessao: (sessao: string) => void;
  pin: ChatPin | null;
  aoDestacar: (pin: ChatPin | null) => void;
}

const MOSTRAR = 14;
const TODAS: Record<Plataforma, boolean> = { yt: true, tw: true, tt: true, kk: true };

export function CaixaChat({ msgs, status, sessao, aoTrocarSessao, pin, aoDestacar }: Props) {
  const [fontes, setFontes] = useState(TODAS);
  const [editando, setEditando] = useState(false);
  const pedirSessao = status !== 'teste' && (!sessao || editando);
  const lista = msgs.filter((m) => fontes[m.plataforma]).slice(-MOSTRAR).reverse();

  return (
    <section className="p-chat">
      <div className="p-bloco-cabeca">
        <div className="p-bloco-titulo">CHAT</div>
        <div className="p-chat__fontes">
          {(Object.keys(PLATAFORMAS) as Plataforma[]).map((p) => (
            <button
              key={p}
              type="button"
              className="p-chat__fonte"
              aria-pressed={fontes[p]}
              style={fontes[p] ? { background: PLATAFORMAS[p].cor, color: '#1A1417' } : undefined}
              onClick={() => setFontes((f) => ({ ...f, [p]: !f[p] }))}
            >
              {PLATAFORMAS[p].tag}
            </button>
          ))}
        </div>
      </div>

      {pin && (
        <div className="p-chat__pin">
          <div className="p-chat__pin-textos">
            <div className="p-chat__pin-rotulo">NA TELA · {pin.autor}</div>
            <div className="p-chat__pin-txt">{pin.txt}</div>
          </div>
          <button type="button" className="p-chat__tirar" onClick={() => aoDestacar(null)}>
            TIRAR
          </button>
        </div>
      )}

      {pedirSessao ? (
        <FormSessao
          inicial={sessao}
          aoSalvar={(s) => {
            aoTrocarSessao(s);
            setEditando(false);
          }}
          aoCancelar={sessao ? () => setEditando(false) : undefined}
        />
      ) : (
        <div className="p-chat__lista">
          {lista.length === 0 && (
            <div className="p-chat__vazio">{status === 'ao_vivo' || status === 'teste' ? 'ESPERANDO MENSAGENS…' : 'CONECTANDO AO CHAT…'}</div>
          )}
          {lista.map((m) => (
            <div key={m.id} className="p-chat__item">
              <div className="p-chat__tag" style={{ background: PLATAFORMAS[m.plataforma].cor }}>
                {PLATAFORMAS[m.plataforma].tag}
              </div>
              <div className="p-chat__txt">
                <span className="p-chat__autor" style={{ '--cor': corNoPainel(m.autor) } as CSSProperties}>
                  {m.autor}
                </span>{' '}
                {m.tipo === 'super' && <span className="p-chat__valor">{m.valor} </span>}
                {m.tipo === 'membro' ? <span className="p-chat__evento">NOVO MEMBRO</span> : m.txt}
              </div>
              {m.tipo !== 'membro' && (
                <button
                  type="button"
                  className="p-chat__destacar"
                  title="Mostrar na tela"
                  onClick={() => aoDestacar({ autor: m.autor, txt: m.txt, plataforma: m.plataforma })}
                >
                  DESTACAR
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="p-chat__rodape">
        via Social Stream Ninja · YouTube, Twitch e TikTok juntos
        {status === 'teste' ? (
          <> · MODO TESTE</>
        ) : (
          sessao &&
          !pedirSessao && (
            <>
              {' '}· sessão {sessao}{' '}
              <button type="button" className="p-chat__trocar" onClick={() => setEditando(true)}>
                TROCAR
              </button>
            </>
          )
        )}
      </div>
    </section>
  );
}

function FormSessao({ inicial, aoSalvar, aoCancelar }: { inicial: string; aoSalvar: (s: string) => void; aoCancelar?: () => void }) {
  const [valor, setValor] = useState(inicial);
  function enviar(e: FormEvent) {
    e.preventDefault();
    aoSalvar(valor.trim());
  }
  return (
    <form className="p-chat__sessao" onSubmit={enviar}>
      <label className="p-chat__sessao-rotulo" htmlFor="p-chat-sessao">
        ID DA SESSÃO DO SOCIAL STREAM NINJA
      </label>
      <div className="p-chat__sessao-linha">
        <input
          id="p-chat-sessao"
          className="p-input p-input--mono"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="ex.: abc123XYZ"
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" className="p-pix__add" disabled={!valor.trim()}>
          CONECTAR
        </button>
      </div>
      <div className="p-chat__sessao-dica">Fica guardado só neste navegador. É o mesmo ID da URL do chat no OBS.</div>
      {aoCancelar && (
        <button type="button" className="p-chat__trocar" onClick={aoCancelar}>
          CANCELAR
        </button>
      )}
    </form>
  );
}
