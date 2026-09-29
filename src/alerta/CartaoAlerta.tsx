import { useState } from 'react';
import type { Alerta } from './useFilaAlertas';
import './alerta.css';

// Referência: referencia/Alerta YT.dc.html
function Barra() {
  return (
    <div className="a-barra">
      <div className="a-barra__cheia" />
    </div>
  );
}

// Carimbo do valor: gira -3° ao entrar. A sombra creme é um bloco atrás (não box-shadow) e, parado,
// o giro deixa de ser animação: caixa girada animada vira camada à parte e o OBS serrilha a borda.
function Carimbo({ valor }: { valor: string }) {
  const [parado, setParado] = useState(false);
  return (
    <div className={parado ? 'a-carimbo a-carimbo--parado' : 'a-carimbo'} onAnimationEnd={(e) => e.target === e.currentTarget && setParado(true)}>
      <div className="a-carimbo__sombra" />
      <div className="a-carimbo__valor">{valor}</div>
    </div>
  );
}

function Superchat({ a }: { a: Alerta }) {
  const sticker = a.tipo === 'sticker';
  return (
    <div className="a-super">
      <div className="a-super__listra" />
      <div className="a-super__corpo">
        <div className="a-super__topo">
          <div className="a-super__quem">
            <div className="a-super__rotulos">
              <span className="a-super__yt">YT</span>
              <span className="a-super__tipo">{sticker ? 'SUPER STICKER' : 'SUPERCHAT'}</span>
            </div>
            <div className="a-super__nome">{a.nome}</div>
          </div>
          <Carimbo valor={a.valor ?? ''} />
        </div>
        {a.msg && !sticker && <div className="a-super__msg">{a.msg}</div>}
        <div className="a-super__barra">
          <Barra />
        </div>
      </div>
    </div>
  );
}

function Membro({ a }: { a: Alerta }) {
  return (
    <div className="a-membro">
      <div className="a-membro__corpo">
        <div className="a-membro__bolinhas">
          {Array.from({ length: 10 }, (_, k) => (
            <div key={k} className={k === 9 ? 'a-membro__bolinha a-membro__bolinha--creme' : 'a-membro__bolinha'} style={{ animationDelay: `${0.35 + k * 0.06}s` }} />
          ))}
        </div>
        <div className="a-membro__textos">
          <div className="a-membro__rotulo">NOVO MEMBRO DA UNIDADE</div>
          <div className="a-membro__nome">{a.nome}</div>
        </div>
      </div>
      <Barra />
    </div>
  );
}

/** Área do alerta no palco 1920×1080: centralizado, 80 px do topo. */
export function CartaoAlerta({ atual, saindo }: { atual: Alerta | null; saindo: boolean }) {
  return (
    <div className="a-area">
      {atual && (
        <div key={atual.id} className={saindo ? 'a-cartao a-cartao--saindo' : 'a-cartao'}>
          {atual.tipo === 'membro' ? <Membro a={atual} /> : <Superchat a={atual} />}
        </div>
      )}
    </div>
  );
}
