import { useEffect, type ReactNode } from 'react';

interface Props {
  titulo: string;
  aoFechar: () => void;
  children: ReactNode;
  /** texto pequeno à direita do título (contador, dica) */
  extra?: ReactNode;
  largo?: boolean;
}

// Modal do painel (mesma cara do GALERA): o que é ajuste de vez em quando sai da tela principal.
// Tudo grava na hora, como no resto do painel; FECHAR só fecha.
export function Modal({ titulo, aoFechar, children, extra, largo }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aoFechar]);

  return (
    <div className="p-modal-fundo" onClick={aoFechar}>
      <div className={largo ? 'p-modal p-modal--largo' : 'p-modal'} role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
        <div className="p-modal__listra" />
        <div className="p-modal__cabeca">
          <div className="p-modal__titulo">{titulo}</div>
          {extra && <div className="p-modal__contador">{extra}</div>}
        </div>
        <div className="p-modal__corpo">{children}</div>
        <div className="p-modal__rodape">
          <button type="button" className="p-botao p-botao--escuro" onClick={aoFechar}>
            FECHAR
          </button>
        </div>
      </div>
    </div>
  );
}
