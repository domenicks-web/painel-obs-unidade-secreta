import { Estado } from '../../types/estado';

interface Props {
  estado: Estado;
  atualizar: (patch: Partial<Estado>) => void;
}

export function SecaoMembros({ estado, atualizar }: Props) {
  function mudarNome(i: number, valor: string) {
    const membros = [...estado.membros];
    membros[i] = { ...membros[i], n: valor };
    atualizar({ membros });
  }

  function mudarFuncao(i: number, valor: string) {
    const membros = [...estado.membros];
    membros[i] = { ...membros[i], f: valor };
    atualizar({ membros });
  }

  function alternarNoAr(i: number) {
    const noAr = estado.noAr.includes(i) ? estado.noAr.filter((x) => x !== i) : [...estado.noAr, i];
    atualizar({ noAr });
  }

  function mostrarNaTela(i: number) {
    atualizar({ lt: i, ltAte: Date.now() + estado.ltSeg * 1000 });
  }

  return (
    <section className="secao">
      <div className="secao__cabecalhoLinha">
        <h2>GALERA · NO AR E NOME NA TELA</h2>
        <button className="secao__botaoSecundario" onClick={() => atualizar({ ltAte: 0 })}>
          ESCONDER NOME
        </button>
      </div>
      {estado.membros.map((m, i) => {
        const noAr = estado.noAr.includes(i);
        return (
          <div className="secao__membroLinha" key={i}>
            <input value={m.n} onChange={(e) => mudarNome(i, e.target.value)} />
            <input value={m.f} onChange={(e) => mudarFuncao(i, e.target.value)} />
            <button className={noAr ? 'secao__botaoDestaque' : ''} onClick={() => alternarNoAr(i)}>
              NO AR
            </button>
            <button className="secao__botaoVioleta" onClick={() => mostrarNaTela(i)}>
              MOSTRAR
            </button>
          </div>
        );
      })}
      <div className="secao__linha">
        <span>Nome fica na tela por</span>
        <input
          type="number"
          min={2}
          value={estado.ltSeg}
          onChange={(e) => atualizar({ ltSeg: Math.max(2, parseInt(e.target.value, 10) || 2) })}
          className="secao__numero"
        />
        <span>segundos</span>
      </div>
    </section>
  );
}
