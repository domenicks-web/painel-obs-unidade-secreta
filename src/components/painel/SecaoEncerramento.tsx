import { Estado } from '../../types/estado';

interface Props {
  estado: Estado;
  atualizar: (patch: Partial<Estado>) => void;
}

export function SecaoEncerramento({ estado, atualizar }: Props) {
  return (
    <section className="secao">
      <h2>ENCERRAMENTO · PRÓXIMO EPISÓDIO</h2>
      <input value={estado.proximo} onChange={(e) => atualizar({ proximo: e.target.value })} />
    </section>
  );
}
