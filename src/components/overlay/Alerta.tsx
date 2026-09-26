interface Props {
  visivel: boolean;
  nome: string;
  mensagem: string;
}

export function Alerta({ visivel, nome, mensagem }: Props) {
  return (
    <div className="alerta" style={{ transform: visivel ? 'translateY(0)' : 'translateY(220px)', opacity: visivel ? 1 : 0 }}>
      <div className="alerta__icone">$</div>
      <div className="alerta__caixa">
        <div className="alerta__nome">{nome || '—'}</div>
        <div className="alerta__mensagem">{mensagem}</div>
      </div>
    </div>
  );
}
