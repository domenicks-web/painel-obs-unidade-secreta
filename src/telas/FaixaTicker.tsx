import { itensLetreiro } from '../live/formatar';
import { Letreiro } from './Letreiro';

export function FaixaTicker({ ticker }: { ticker: string }) {
  const itens = itensLetreiro(ticker);
  return (
    <div className="t-ticker">
      <div className="t-ticker__listra" />
      <div className="t-ticker__trilho">
        <div className="t-ticker__texto">
          <Letreiro itens={[...itens, ...itens, ...itens, ...itens]} />
        </div>
      </div>
    </div>
  );
}
