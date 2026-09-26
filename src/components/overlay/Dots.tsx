interface DotsProps {
  variante: 'acende' | 'respira';
  tamanho?: number;
}

export function Dots({ variante, tamanho = 30 }: DotsProps) {
  return (
    <div className="dots">
      {Array.from({ length: 10 }, (_, i) => {
        const animacao =
          variante === 'acende' ? `acende 3s ${(i * 0.25).toFixed(2)}s infinite` : `respira 5s ${(i * 0.2).toFixed(1)}s infinite ease-in-out`;
        const cor = variante === 'acende' ? (i === 0 ? 'var(--laranja)' : 'var(--creme)') : 'var(--laranja)';
        return (
          <div
            key={i}
            className="dots__item"
            style={{ width: tamanho, height: tamanho, background: cor, animation: animacao }}
          />
        );
      })}
    </div>
  );
}
