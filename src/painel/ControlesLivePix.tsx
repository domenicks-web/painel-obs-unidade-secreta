import { useEffect, useRef, useState } from 'react';
import type { ControlesLivePix as Controles } from '../live/useControlesLivePix';

const FALHA_MS = 3000;

// Pisca o botão de laranja por 150 ms ao clicar (no elemento, sem re-render).
function confirmarClique(el: HTMLElement | null) {
  el?.animate?.(
    [
      { background: '#FF6B1F', color: '#1A1417' },
      { background: '#FF6B1F', color: '#1A1417' },
    ],
    { duration: 150 },
  );
}

export function ControlesLivePix({ controles }: { controles: Controles }) {
  const pausado = controles.status === 'pausado';
  const [falhou, setFalhou] = useState<string | null>(null);
  const [confirmandoLimpar, setConfirmandoLimpar] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function acionar(id: string, el: HTMLButtonElement, acao: () => Promise<boolean>) {
    confirmarClique(el);
    const ok = await acao();
    if (ok) return;
    clearTimeout(timer.current);
    setFalhou(id);
    timer.current = setTimeout(() => setFalhou(null), FALHA_MS);
  }

  const botoes: { id: string; rotulo: string; aoClicar: (el: HTMLButtonElement) => void; extra?: string }[] = [
    {
      id: 'pausa',
      rotulo: pausado ? 'RETOMAR' : 'PAUSAR ALERTAS',
      aoClicar: (el) => acionar('pausa', el, controles.alternarPausa),
      extra: pausado ? ' p-livepix__botao--pausado' : '',
    },
    { id: 'pular', rotulo: 'PULAR', aoClicar: (el) => acionar('pular', el, controles.pular) },
    { id: 'repetir', rotulo: 'REPETIR', aoClicar: (el) => acionar('repetir', el, controles.repetir) },
    {
      id: 'limpar',
      rotulo: 'LIMPAR FILA',
      aoClicar: () => setConfirmandoLimpar(true),
      extra: confirmandoLimpar ? ' p-livepix__botao--confirmando' : '',
    },
  ];

  let faixa = null;
  if (confirmandoLimpar) {
    faixa = (
      <div className="p-livepix__confirmar" role="alertdialog" aria-label="Limpar fila?">
        <span className="p-livepix__pergunta">LIMPAR FILA?</span>
        <button
          type="button"
          className="p-livepix__sim"
          onClick={(e) => {
            setConfirmandoLimpar(false);
            acionar('limpar', e.currentTarget, controles.limpar);
          }}
        >
          LIMPAR
        </button>
        <button type="button" className="p-livepix__nao" onClick={() => setConfirmandoLimpar(false)}>
          CANCELAR
        </button>
      </div>
    );
  } else if (falhou) {
    faixa = (
      <div className="p-livepix__faixa p-livepix__faixa--erro" role="alert">
        FALHOU · TENTA DE NOVO
      </div>
    );
  } else if (pausado) {
    faixa = <div className="p-livepix__faixa">ALERTAS PAUSADOS · FILA SEGURANDO</div>;
  }

  return (
    <div className="p-livepix">
      <div className="p-livepix__botoes">
        {botoes.map((b) => (
          <button
            key={b.id}
            type="button"
            className={`p-livepix__botao${b.extra ?? ''}${falhou === b.id ? ' p-livepix__botao--falhou' : ''}`}
            onClick={(e) => b.aoClicar(e.currentTarget)}
          >
            {b.rotulo}
          </button>
        ))}
      </div>
      {faixa}
    </div>
  );
}
