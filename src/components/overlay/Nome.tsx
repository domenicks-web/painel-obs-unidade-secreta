import { Estado } from '../../types/estado';

interface Props {
  estado: Estado;
  agoraServidor: number;
}

export function Nome({ estado, agoraServidor }: Props) {
  const membro = estado.membros[estado.lt] ?? estado.membros[0];
  const ativo = !!estado.membros[estado.lt] && agoraServidor < estado.ltAte;

  return (
    <div
      className="nome"
      style={{
        transform: ativo ? 'translateX(0)' : 'translateX(-1100px)',
        opacity: ativo ? 1 : 0,
      }}
    >
      <div className="nome__logo">US</div>
      <div className="nome__caixa">
        <div className="nome__nome">{membro.n}</div>
        <div className="nome__funcao">{membro.f}</div>
      </div>
    </div>
  );
}
