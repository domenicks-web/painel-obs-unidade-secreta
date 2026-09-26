import { EventoAlerta } from '../../types/estado';

interface Props {
  disparar: (evento: EventoAlerta) => void;
}

export function SecaoAlerta({ disparar }: Props) {
  return (
    <section className="secao">
      <h2>ALERTA DE DOAÇÃO</h2>
      <p>As doações reais chegam pela plataforma de pix/doação de vocês. Este botão só testa a animação na tela.</p>
      <button onClick={() => disparar({ nome: 'TESTE', mensagem: 'Isso é só um teste do alerta 🎉' })}>DISPARAR ALERTA DE TESTE</button>
    </section>
  );
}
