// Parte 3 (Social Stream Ninja) liga o chat aqui. Por enquanto só o lugar reservado.
export function CaixaChat() {
  return (
    <section className="p-chat">
      <div className="p-bloco-cabeca">
        <div className="p-bloco-titulo">CHAT</div>
        <div className="p-chat__fontes">
          {['YT', 'TW', 'TT'].map((f) => (
            <button key={f} type="button" className="p-chat__fonte" disabled>
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="p-chat__corpo">O CHAT CHEGA NA PARTE 3</div>
      <div className="p-chat__rodape">via Social Stream Ninja · YouTube, Twitch e TikTok juntos</div>
    </section>
  );
}
