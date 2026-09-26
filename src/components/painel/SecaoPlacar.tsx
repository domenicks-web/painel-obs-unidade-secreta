import { Estado } from '../../types/estado';

interface Props {
  estado: Estado;
  atualizar: (patch: Partial<Estado>) => void;
}

export function SecaoPlacar({ estado, atualizar }: Props) {
  const somar = (chave: 'golsA' | 'golsB', delta: number) => atualizar({ [chave]: Math.max(0, estado[chave] + delta) });

  return (
    <section className="secao">
      <h2>PLACAR</h2>
      <input value={estado.jogo} placeholder="Etiqueta (ex: FIFA · RODADA 3)" onChange={(e) => atualizar({ jogo: e.target.value })} />
      <div className="secao__placarGrade">
        <input value={estado.timeA} onChange={(e) => atualizar({ timeA: e.target.value })} />
        <button onClick={() => somar('golsA', -1)}>−</button>
        <div className="secao__golNumero">{estado.golsA}</div>
        <button className="secao__botaoDestaque" onClick={() => somar('golsA', 1)}>
          +
        </button>
        <input value={estado.timeB} onChange={(e) => atualizar({ timeB: e.target.value })} />
        <button onClick={() => somar('golsB', -1)}>−</button>
        <div className="secao__golNumero">{estado.golsB}</div>
        <button className="secao__botaoDestaque" onClick={() => somar('golsB', 1)}>
          +
        </button>
      </div>
      <button className="secao__botaoSecundario" onClick={() => atualizar({ golsA: 0, golsB: 0 })}>
        ZERAR PLACAR
      </button>
    </section>
  );
}
