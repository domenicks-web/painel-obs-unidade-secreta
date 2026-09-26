import { Estado } from '../../types/estado';

interface Props {
  estado: Estado;
}

export function Jogo({ estado }: Props) {
  const noAr = estado.noAr.map((i) => estado.membros[i]).filter(Boolean);

  return (
    <>
      <div className="jogo__topoEsquerda">
        <div className="jogo__logo">US</div>
        <div className="jogo__aoVivo">
          <div className="jogo__bolinha" />
          <div className="jogo__aoVivoTexto">AO VIVO</div>
        </div>
      </div>
      <div className="jogo__placarWrap">
        <div className="jogo__placarLinha">
          <div className="jogo__time">{estado.timeA}</div>
          <div className="jogo__gols">
            <span>{estado.golsA}</span>
            <span>–</span>
            <span>{estado.golsB}</span>
          </div>
          <div className="jogo__time">{estado.timeB}</div>
        </div>
        <div className="jogo__etiqueta">{estado.jogo}</div>
      </div>
      <div className="jogo__noAr">
        <div className="jogo__noArLabel">NO AR · {noAr.length}</div>
        {noAr.map((m, i) => (
          <div className="jogo__noArItem" key={i}>
            <div className="jogo__noArBolinha" />
            {m.n}
          </div>
        ))}
      </div>
    </>
  );
}
