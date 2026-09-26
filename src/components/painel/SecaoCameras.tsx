import { Estado } from '../../types/estado';

interface Props {
  estado: Estado;
  atualizar: (patch: Partial<Estado>) => void;
}

export function SecaoCameras({ estado, atualizar }: Props) {
  function mudarCam(i: number, valor: string) {
    const novasCams = [...estado.cams];
    novasCams[i] = valor;
    atualizar({ cams: novasCams });
  }

  return (
    <section className="secao">
      <h2>CÂMERAS DO REACT</h2>
      {[0, 1, 2].map((i) => (
        <div className="secao__linha" key={i}>
          <span className="secao__camLabel">CAM {i + 1}</span>
          <input value={estado.cams[i] || ''} onChange={(e) => mudarCam(i, e.target.value)} />
        </div>
      ))}
    </section>
  );
}
