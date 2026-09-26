import { Estado } from '../../types/estado';
import { formatRelogio } from '../../lib/tempo';

interface Props {
  estado: Estado;
  restanteMs: number;
  atualizar: (patch: Partial<Estado>) => void;
}

export function SecaoComecando({ estado, restanteMs, atualizar }: Props) {
  return (
    <section className="secao">
      <h2>COMEÇANDO</h2>
      <input
        value={estado.titulo}
        placeholder="Título da live"
        onChange={(e) => atualizar({ titulo: e.target.value })}
      />
      <div className="secao__linha">
        <input
          type="number"
          min={1}
          value={estado.minutos}
          onChange={(e) => atualizar({ minutos: Math.max(1, parseInt(e.target.value, 10) || 1) })}
          className="secao__numero"
        />
        <span>min</span>
        <button onClick={() => atualizar({ fim: Date.now() + estado.minutos * 60_000 })}>INICIAR CONTAGEM</button>
        <button className="secao__botaoSecundario" onClick={() => atualizar({ fim: 0 })}>
          ZERAR
        </button>
        <span className="secao__relogio">{estado.fim ? formatRelogio(restanteMs) : ''}</span>
      </div>
    </section>
  );
}
