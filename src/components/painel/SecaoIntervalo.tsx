import { Estado } from '../../types/estado';

interface Props {
  estado: Estado;
  atualizar: (patch: Partial<Estado>) => void;
}

export function SecaoIntervalo({ estado, atualizar }: Props) {
  return (
    <section className="secao">
      <h2>INTERVALO · MENSAGEM</h2>
      <input value={estado.msg} onChange={(e) => atualizar({ msg: e.target.value })} />
    </section>
  );
}
