import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Palco, usarFundoTransparente } from '../telas/Palco';
import { useChat } from '../chat/useChat';
import { sessaoPadraoDev } from '../chat/sessao';
import { apoioDoYouTube } from '../apoios/youtube';
import { CartaoAlerta } from '../alerta/CartaoAlerta';
import { useFilaAlertas, type Alerta } from '../alerta/useFilaAlertas';
import { lerSalvo, useControleRemoto } from '../alerta/remoto';
import { useLivePixSeguro } from '../alerta/livepixSeguro';
import { useLive } from '../live/useLive';
import { RelogioServidorProvider, useOffsetServidor } from '../live/relogioServidor';
import { useGolAoVivo } from '../gol/useGolAoVivo';

// /alerta?sessao=ID&chave=K → fonte do OBS 1920×1080, transparente: superchat, super sticker e
//                            membro novo do YouTube, direto do Social Stream Ninja.
// /alerta?teste=1           → página de teste da referência, sem SSN e sem mexer no LivePix.
export function AlertaPage() {
  const [params] = useSearchParams();
  if (params.get('teste') === '1') return <AlertaTeste />;
  return (
    <RelogioServidorProvider>
      <AlertaAoVivo sessao={params.get('sessao') || sessaoPadraoDev()} chave={params.get('chave') ?? ''} />
    </RelogioServidorProvider>
  );
}


function AlertaAoVivo({ sessao, chave }: { sessao: string; chave: string }) {
  usarFundoTransparente();
  const { msgs } = useChat({ sessao, max: 50 });
  const livepix = useLivePixSeguro(chave);
  // a fila e o histórico sobrevivem à recarga da fonte; o painel vê e controla a fila (playlist)
  const [inicial] = useState(lerSalvo);
  const fila = useFilaAlertas({ aoComecar: livepix.segurar, aoTerminar: livepix.soltar, inicial: inicial ?? undefined });
  useControleRemoto(fila);
  const { atual, saindo, adicionar } = fila;

  // gol na tela (animação do FUTEBOL): a fila espera e o LivePix fica pausado até a animação acabar
  const { estado } = useLive();
  const { gol } = useGolAoVivo(estado.golEvento, useOffsetServidor());
  const { segurar: segurarFila, soltar: soltarFila } = fila;
  const temGol = !!gol;
  useEffect(() => {
    if (!temGol) return;
    segurarFila('gol');
    livepix.segurar();
    return () => {
      soltarFila('gol');
      livepix.soltar();
    };
  }, [temGol, segurarFila, soltarFila, livepix]);
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
