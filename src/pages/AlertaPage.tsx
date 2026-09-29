import { useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Palco, usarFundoTransparente } from '../telas/Palco';
import { useChat } from '../chat/useChat';
import { sessaoPadraoDev } from '../chat/sessao';
import { apoioDoYouTube } from '../apoios/youtube';
import { CartaoAlerta } from '../alerta/CartaoAlerta';
import { useFilaAlertas, type Alerta } from '../alerta/useFilaAlertas';

// /alerta?sessao=ID&chave=K → fonte do OBS 1920×1080, transparente: superchat, super sticker e
//                            membro novo do YouTube, direto do Social Stream Ninja.
// /alerta?teste=1           → página de teste da referência, sem SSN e sem mexer no LivePix.
export function AlertaPage() {
  const [params] = useSearchParams();
  if (params.get('teste') === '1') return <AlertaTeste />;
  return <AlertaAoVivo sessao={params.get('sessao') || sessaoPadraoDev()} chave={params.get('chave') ?? ''} />;
}

// Segura o LivePix enquanto os alertas tocam. Os pedidos vão em fila (soltar nunca passa na
// frente de segurar). Sem chave, o alerta toca mas não mexe no LivePix.
function useLivePixSeguro(chave: string) {
  const fila = useRef<Promise<unknown>>(Promise.resolve());
  const segurando = useRef(false);

  const pedir = useCallback(
    (acao: 'segurar' | 'soltar', aoSair = false) => {
      if (!chave) return;
      const enviar = () =>
        fetch('/api/livepix/alerta', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-alerta-chave': chave },
          body: JSON.stringify({ acao }),
          keepalive: aoSair,
        }).catch(() => null);
      fila.current = aoSair ? enviar() : fila.current.then(enviar);
    },
    [chave],
  );

  const segurar = useCallback(() => {
    segurando.current = true;
    pedir('segurar');
  }, [pedir]);
  const soltar = useCallback(() => {
    segurando.current = false;
    pedir('soltar');
  }, [pedir]);

  // fechou a fonte no meio de um alerta: não deixa o LivePix preso
  useEffect(() => {
    const aoSair = () => {
      if (segurando.current) {
        segurando.current = false;
        pedir('soltar', true);
      }
    };
    window.addEventListener('pagehide', aoSair);
    return () => {
      window.removeEventListener('pagehide', aoSair);
      aoSair();
    };
  }, [pedir]);

  return { segurar, soltar };
}

function AlertaAoVivo({ sessao, chave }: { sessao: string; chave: string }) {
  usarFundoTransparente();
  const { msgs } = useChat({ sessao, max: 50 });
  const livepix = useLivePixSeguro(chave);
  const { atual, saindo, adicionar } = useFilaAlertas({ aoComecar: livepix.segurar, aoTerminar: livepix.soltar });
  const vistos = useRef(new Set<string>());

  useEffect(() => {
    for (const m of msgs) {
      if (vistos.current.has(m.id)) continue;
      vistos.current.add(m.id);
      const apoio = apoioDoYouTube(m);
      if (!apoio) continue;
      adicionar({ id: m.id, tipo: apoio.tipo, nome: m.autor, valor: m.valor, msg: apoio.tipo === 'superchat' ? m.txt : undefined });
    }
  }, [msgs, adicionar]);

  return (
    <Palco>
      <CartaoAlerta atual={atual} saindo={saindo} />
    </Palco>
  );
}

// mesmas listas da referência
const NOMES = ['Caio Neves', 'Duda', 'Rafa Monteiro', 'Lu Ferraz', 'Tiago_BH', 'Mari'];
const MSGS = ['manda salve pro pessoal de BH!!', 'ESSE JUIZ TA VENDIDO', 'melhor live do sábado, tamo junto', ''];
const VAL = ['R$ 5,00', 'R$ 20,00', 'R$ 50,00', 'US$ 10.00'];
const sortear = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
let n = 0;

function AlertaTeste() {
  const { atual, saindo, tamanho, adicionar } = useFilaAlertas();
  const novo = (tipo: Alerta['tipo']): Alerta => ({
    id: `teste-${++n}`,
    tipo,
    nome: sortear(NOMES),
    valor: tipo === 'membro' ? undefined : sortear(VAL),
    msg: tipo === 'superchat' ? sortear(MSGS) : undefined,
  });

  return (
    <div className="a-teste">
      <div className="a-teste__barra">
        <div className="a-teste__titulo">ALERTA YT · TESTE</div>
        <button type="button" className="a-teste__botao" onClick={() => adicionar(novo('superchat'))}>
          + SUPERCHAT
        </button>
        <button type="button" className="a-teste__botao a-teste__botao--creme" onClick={() => adicionar(novo('sticker'))}>
          + SUPER STICKER
        </button>
        <button type="button" className="a-teste__botao a-teste__botao--violeta" onClick={() => adicionar(novo('membro'))}>
          + MEMBRO
        </button>
        <div className="a-teste__fila">FILA: {tamanho}</div>
      </div>
      <div className="a-teste__nota">
        Fonte 1920×1080 transparente. Um alerta por vez: 0,5 s entrando, 6 s na tela, 0,5 s saindo. Enquanto toca, o LivePix fica pausado.
      </div>
      <div className="a-teste__palco">
        <CartaoAlerta atual={atual} saindo={saindo} />
      </div>
    </div>
  );
}
