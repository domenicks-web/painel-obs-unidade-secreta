import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { COR_AMARELO, COR_VERMELHO, SeloCartao, SeloGol } from '../escalacao/Selos';

// Confirmação padrão do painel (no lugar do window.confirm): cartão animado com ícone, título,
// texto e CANCELAR / CONFIRMAR. confirmar(...) devolve uma Promise<boolean>.

export type Tom = 'perigo' | 'gol' | 'aviso' | 'cartao';

export interface PedidoConfirmacao {
  titulo: string;
  texto: ReactNode;
  /** texto do botão de confirmar (padrão: CONFIRMAR) */
  sim?: string;
  nao?: string;
  tom?: Tom;
}

type Confirmar = (p: PedidoConfirmacao) => Promise<boolean>;

const Contexto = createContext<Confirmar | null>(null);

// fora do provider (testes de componente solto): cai no confirm do navegador
const reserva: Confirmar = async (p) => window.confirm(`${p.titulo}\n${typeof p.texto === 'string' ? p.texto : ''}`);

export function useConfirmar(): Confirmar {
  return useContext(Contexto) ?? reserva;
}

interface Aberto extends PedidoConfirmacao {
  responder: (v: boolean) => void;
}

export function ConfirmarProvider({ children }: { children: ReactNode }) {
  const [aberto, setAberto] = useState<Aberto | null>(null);
  const confirmar = useCallback<Confirmar>(
    (p) =>
      new Promise<boolean>((resolve) => {
        setAberto((anterior) => {
          anterior?.responder(false); // um pedido novo cancela o que estava aberto
          return { ...p, responder: resolve };
        });
      }),
    [],
  );
  const responder = useCallback(
    (v: boolean) =>
      setAberto((a) => {
        a?.responder(v);
        return null;
      }),
    [],
  );
  return (
    <Contexto.Provider value={confirmar}>
      {children}
      {aberto && <CaixaConfirmar {...aberto} aoResponder={responder} />}
    </Contexto.Provider>
  );
}

function Icone({ tom }: { tom: Tom }) {
  if (tom === 'gol') return <SeloGol tam={64} />;
  if (tom === 'cartao') return <SeloCartao cor={COR_VERMELHO} tam={70} />;
  // aviso / perigo: triângulo
  const cor = tom === 'perigo' ? COR_VERMELHO : COR_AMARELO;
  return (
    <svg width="66" height="60" viewBox="0 0 66 60" aria-hidden>
      <path d="M33 4 L63 56 H3 Z" fill={cor} stroke="#1A1417" strokeWidth="4" strokeLinejoin="round" />
      <rect x="30" y="20" width="6" height="20" rx="2" fill="#1A1417" />
      <rect x="30" y="44" width="6" height="6" rx="2" fill="#1A1417" />
    </svg>
  );
}

function CaixaConfirmar({ titulo, texto, sim = 'CONFIRMAR', nao = 'CANCELAR', tom = 'aviso', aoResponder }: Aberto & { aoResponder: (v: boolean) => void }) {
  const botao = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    botao.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        aoResponder(false);
      }
    };
    // captura: o Esc fecha só a confirmação, não o modal que está embaixo
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [aoResponder]);

  return (
    <div className="p-confirmar-fundo" onClick={() => aoResponder(false)}>
      <div
        className={`p-confirmar p-confirmar--${tom}`}
        role="alertdialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-confirmar__listra" />
        <div className="p-confirmar__icone">
          <Icone tom={tom} />
        </div>
        <div className="p-confirmar__titulo">{titulo}</div>
        <div className="p-confirmar__texto">{texto}</div>
        <div className="p-confirmar__botoes">
          <button type="button" className="p-botao p-botao--escuro" onClick={() => aoResponder(false)}>
            {nao}
          </button>
          <button ref={botao} type="button" className="p-botao p-confirmar__sim" onClick={() => aoResponder(true)}>
            {sim}
          </button>
        </div>
      </div>
    </div>
  );
}
