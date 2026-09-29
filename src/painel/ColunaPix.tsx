import { useState, type FormEvent } from 'react';
import type { useLive } from '../live/useLive';
import type { usePix } from '../live/usePix';
import { reais } from '../live/formatar';
import { CampoTexto } from './CampoTexto';
import { ControlesLivePix } from './ControlesLivePix';
import type { ControlesLivePix as Controles } from '../live/useControlesLivePix';

type Live = Pick<ReturnType<typeof useLive>, 'estado' | 'salvarDepois'>;
type PixHook = ReturnType<typeof usePix>;

const numero = (v: string) => Number(v.replace(',', '.'));

export function ColunaPix({ live, pix, livepix }: { live: Live; pix: PixHook; livepix?: Controles }) {
  const { estado, salvarDepois } = live;
  const pct = Math.min(100, Math.round((estado.metaAtual / Math.max(1, estado.metaTotal)) * 100)) + '%';
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function adicionar(e?: FormEvent) {
    e?.preventDefault();
    const n = nome.trim();
    const v = numero(valor);
    if (!n) return setErro('Põe o nome de quem mandou.');
    if (!(v > 0)) return setErro('Põe um valor maior que zero.');
    setErro(null);
    setEnviando(true);
    const falha = await pix.adicionarManual(n, v);
    setEnviando(false);
    if (falha) return setErro(`Não deu pra adicionar: ${falha}`);
    setNome('');
    setValor('');
  }

  return (
    <section className="p-pix">
      <div className="p-bloco-cabeca">
        <div className="p-bloco-titulo">PIX</div>
        <div className="p-bloco-selo">MANUAL · ALERTA LIVEPIX</div>
      </div>

      {livepix && <ControlesLivePix controles={livepix} />}

      <div className="p-meta">
        <div className="p-meta__topo">
          <div className="p-meta__desc">META · {estado.metaDesc}</div>
          <div className="p-meta__pct">{pct}</div>
        </div>
        <div className="p-meta__valores">
          <div className="p-meta__atual">R$ {reais(estado.metaAtual)}</div>
          <div className="p-meta__total">/ R$ {reais(estado.metaTotal)}</div>
        </div>
        <div className="p-meta__barra">
          <div className="p-meta__cheia" style={{ width: pct }} />
        </div>
      </div>

      <div className="p-pix__campos">
        <CampoTexto className="p-input p-input--pequeno" ariaLabel="OBJETIVO" placeholder="OBJETIVO" valor={estado.metaDesc} maiusculo aoMudar={(v) => salvarDepois({ metaDesc: v })} />
        <CampoTexto
          className="p-input p-input--mono"
          ariaLabel="META R$"
          inputMode="decimal"
          valor={String(estado.metaTotal)}
          // campo vazio ou zero no meio da digitação não vai ao ar: fica o último valor válido
          aoMudar={(v) => {
            const n = numero(v);
            if (n > 0) salvarDepois({ metaTotal: n });
          }}
        />
        <CampoTexto
          className="p-input p-input--mono"
          ariaLabel="AJUSTE R$"
          inputMode="decimal"
          title="Ajuste manual somado à meta"
          valor={String(estado.ajuste)}
          aoMudar={(v) => salvarDepois({ ajuste: numero(v) || 0 })}
        />
      </div>
      <div className="p-pix__rotulos" aria-hidden>
        <div>OBJETIVO</div>
        <div>META R$</div>
        <div>AJUSTE R$</div>
      </div>

      <div className="p-pix__lista">
        {pix.lista.length === 0 && <div className="p-pix__vazio">Nenhum PIX ainda.</div>}
        {pix.lista.map((x) => (
          <div key={x.id} className={x.off ? 'p-pix__item p-pix__item--off' : 'p-pix__item'}>
            <div className="p-pix__info">
              <div className="p-pix__linha">
                <div className="p-pix__nome">{x.nome}</div>
                <div className="p-pix__origem">{x.origem === 'livepix' ? 'LIVEPIX' : 'MANUAL'}</div>
              </div>
              <div className="p-pix__msg">{x.msg || '—'}</div>
            </div>
            <div className="p-pix__valor">R$ {reais(x.valor)}</div>
            <button
              type="button"
              className="p-pix__alternar"
              title={x.off ? 'Voltar a contar' : 'Não contar (estorno/teste)'}
              onClick={() => pix.alternar(x.id)}
            >
              {x.off ? '↺' : '×'}
            </button>
          </div>
        ))}
      </div>

      <form className="p-pix__novo" onSubmit={adicionar}>
        <input
          className="p-input p-input--pequeno"
          placeholder="NOME (PIX MANUAL)"
          aria-label="NOME (PIX MANUAL)"
          value={nome}
          onChange={(e) => setNome(e.target.value.toUpperCase())}
        />
        <input
          className="p-input p-input--mono"
          placeholder="R$"
          aria-label="VALOR DO PIX MANUAL"
          inputMode="decimal"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />
        <button type="submit" className="p-pix__add" disabled={enviando}>
          + ADD
        </button>
      </form>
      {erro && (
        <div className="p-erro" role="alert">
          {erro}
        </div>
      )}
    </section>
  );
}
