export function Letreiro({ itens }: { itens: string[] }) {
  return (
    <>
      {itens.map((t, i) => (
        <span key={i} style={{ whiteSpace: 'nowrap' }}>
          {t}
          <i className="us-ponto" />
        </span>
      ))}
    </>
  );
}

// Letreiro de fundo: duas metades iguais pra animação usMarq/usMarqR fechar o loop.
// Cada repetição imprime todos os itens (ex.: "FIM DA LIVE ● VALEU ●").
export function Linha({ itens, repeticoes }: { itens: string[]; repeticoes: number }) {
  const metade = (
    <span>
      {Array.from({ length: repeticoes }, (_, r) =>
        itens.map((t, i) => (
          <span key={`${r}-${i}`}>
            {t}
            <i className="us-ponto" />
          </span>
        )),
      )}
    </span>
  );
  return (
    <>
      {metade}
      {metade}
    </>
  );
}
