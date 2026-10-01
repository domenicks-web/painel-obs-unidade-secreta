import { useState } from 'react';
import type { useLive } from '../live/useLive';
import { JOGO_OPCOES, type PatchLive, type TelaId } from '../live/tipos';
import { lerTempo, mmss, segundosJogo } from '../live/relogios';
import { useAgora } from '../live/relogioServidor';
import { CampoTexto } from './CampoTexto';
import { CampoCamera } from './CampoCamera';

type Live = ReturnType<typeof useLive>;

const MINUTOS = [2, 5, 10, 15, 30];
const limitar = (v: string) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));

function classeOpcao(ativa: boolean, extra: string, violeta = false) {
  return `p-opcao ${extra}${ativa ? (violeta ? ' p-opcao--ativa-violeta' : ' p-opcao--ativa') : ''}`;
}

export function CamposTela({ tela, live }: { tela: TelaId; live: Live }) {
  return (
    <>
      {tela === 'futebol' && <CamposFutebol live={live} />}
      {(tela === 'host' || tela === 'mesa' || tela === 'futebol' || tela === 'filme') && <Cameras tela={tela} live={live} />}
      {tela === 'host' && (
        <CampoTexto rotulo="PIX LINK" valor={live.estado.pixLink} maiusculo aoMudar={(v) => live.salvarDepois({ pixLink: v })} />
      )}
      {tela === 'filme' && (
        <div className="p-duas p-duas--filme">
          <CampoTexto rotulo="EM CARTAZ" valor={live.estado.filme} maiusculo aoMudar={(v) => live.salvarDepois({ filme: v })} />
          <CampoTexto rotulo="EPISÓDIO" valor={live.estado.episodio} maiusculo aoMudar={(v) => live.salvarDepois({ episodio: v })} />
        </div>
      )}
      {(tela === 'inicio' || tela === 'intervalo') && <Contagem tela={tela} live={live} />}
      {tela === 'lower' && <CamposLower live={live} />}
      {tela === 'fim' && (
        <CampoTexto rotulo="PRÓXIMA LIVE" valor={live.estado.proximo} maiusculo aoMudar={(v) => live.salvarDepois({ proximo: v })} />
      )}
      {tela === 'tecnico' && <div className="p-texto-fraco">Essa tela não tem infos pra editar.</div>}
    </>
  );
}

function Cameras({ tela, live }: { tela: TelaId; live: Live }) {
  const { estado } = live;
  const qtd = tela === 'mesa' ? 6 : tela === 'filme' ? 4 : tela === 'futebol' ? 2 : Number(estado.hostCams);
  return (
    <>
      {tela === 'host' && (
        <div className="p-linha">
          <div className="p-rotulo p-rotulo--grande">CÂMERAS</div>
          <div className="p-opcoes">
            {(['1', '2', '3'] as const).map((c) => (
              <button key={c} type="button" className={classeOpcao(estado.hostCams === c, 'p-opcao--cam')} onClick={() => live.salvar({ hostCams: c })}>
                {c}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="p-cameras">
        {Array.from({ length: qtd }, (_, i) => (
          <CampoCamera
            key={i}
            numero={i + 1}
            valor={estado.nomes[i] ?? ''}
            galera={estado.galera}
            // só o índice desta câmera: outra pessoa pode estar mudando outra câmera ao mesmo tempo
            aoMudar={(v) => live.salvarDepois({ [`nomes.${i}`]: v } as PatchLive)}
          />
        ))}
      </div>
    </>
  );
}

function CamposFutebol({ live }: { live: Live }) {
  const { estado, salvar, salvarDepois } = live;
  const agora = useAgora(500);

  return (
    <>
      <div className="p-placar">
        <div className="p-placar__lado">
          <CampoTexto className="p-input p-input--time" valor={estado.timeA} maiusculo aoMudar={(v) => salvarDepois({ timeA: v })} title="Time da casa" />
          <div className="p-placar__gols">
            <button type="button" className="p-placar__menos" onClick={() => live.gol('A', -1)}>
              −
            </button>
            <div className="p-placar__numero">{estado.golsA}</div>
            <button type="button" className="p-placar__mais" onClick={() => live.gol('A', 1)}>
              +
            </button>
          </div>
        </div>
        <div className="p-relogio">
          <div className="p-relogio__rotulo">RELÓGIO</div>
          <div className="p-relogio__tempo">{mmss(segundosJogo(estado, agora))}</div>
          <div className="p-relogio__botoes">
            <button
              type="button"
              className={estado.clockRodando ? 'p-relogio__play p-relogio__play--rodando' : 'p-relogio__play'}
              onClick={() => live.relogio(estado.clockRodando ? 'pausar' : 'iniciar')}
            >
              {estado.clockRodando ? '❚❚ PAUSAR' : estado.clockAcumulado > 0 ? '▶ RETOMAR' : '▶ INICIAR'}
            </button>
            <button type="button" className="p-botao-contorno" onClick={() => live.relogio('zerar')}>
              ZERAR
            </button>
          </div>
          <AjusteRelogio live={live} />
        </div>
        <div className="p-placar__lado">
          <CampoTexto className="p-input p-input--time p-input--time-b" valor={estado.timeB} maiusculo aoMudar={(v) => salvarDepois({ timeB: v })} title="Time de fora" />
          <div className="p-placar__gols">
            <button type="button" className="p-placar__menos" onClick={() => live.gol('B', -1)}>
              −
            </button>
            <div className="p-placar__numero p-placar__numero--b">{estado.golsB}</div>
            <button type="button" className="p-placar__mais p-placar__mais--b" onClick={() => live.gol('B', 1)}>
              +
            </button>
          </div>
        </div>
      </div>

      <div className="p-opcoes" style={{ gap: 8 }}>
        {JOGO_OPCOES.map((j) => (
          <button key={j} type="button" className={classeOpcao(estado.jogo === j, 'p-opcao--tempo', true)} onClick={() => salvar({ jogo: j })}>
            {j}
          </button>
        ))}
      </div>
      {estado.jogo === 'OUTRO' && (
        <CampoTexto rotulo="TEXTO DO TEMPO" valor={estado.jogoOutro} maiusculo placeholder="EX.: PÊNALTIS" aoMudar={(v) => salvarDepois({ jogoOutro: v })} />
      )}

      <div className="p-campo">
        <div className="p-rotulo">ENQUETE · QUEM GANHA? (EM %)</div>
        <div className="p-enquete">
          <CampoTexto rotulo={estado.timeA} tipo="number" valor={String(estado.enquete.casa)} aoMudar={(v) => salvarDepois({ 'enquete.casa': limitar(v) })} />
          <CampoTexto rotulo="EMPATE" tipo="number" valor={String(estado.enquete.empate)} aoMudar={(v) => salvarDepois({ 'enquete.empate': limitar(v) })} />
          <CampoTexto rotulo={estado.timeB} tipo="number" valor={String(estado.enquete.fora)} aoMudar={(v) => salvarDepois({ 'enquete.fora': limitar(v) })} />
          <button
            type="button"
            className={estado.enquete.mostrar ? 'p-chave p-chave--ligada' : 'p-chave'}
            aria-pressed={estado.enquete.mostrar}
            onClick={() => salvar({ 'enquete.mostrar': !estado.enquete.mostrar })}
          >
            {estado.enquete.mostrar ? 'ESCONDER' : 'MOSTRAR'}
          </button>
        </div>
      </div>
    </>
  );
}

function Contagem({ tela, live }: { tela: 'inicio' | 'intervalo'; live: Live }) {
  const { estado } = live;
  return (
    <>
      {tela === 'intervalo' && (
        <CampoTexto rotulo="FRASE NA TELA" valor={estado.msg} maiusculo aoMudar={(v) => live.salvarDepois({ msg: v })} />
      )}
      <div className="p-linha">
        <div className="p-rotulo p-rotulo--grande">CONTAGEM</div>
        <div className="p-opcoes">
          {MINUTOS.map((m) => (
            <button key={m} type="button" className={classeOpcao(estado.minutos === m, 'p-opcao--min')} onClick={() => live.salvar({ minutos: m })}>
              {m} MIN
            </button>
          ))}
        </div>
        <button type="button" className="p-botao-contorno" onClick={() => live.reiniciarContagem()}>
          ↻ REINICIAR
        </button>
      </div>
    </>
  );
}

function CamposLower({ live }: { live: Live }) {
  const { estado } = live;
  const galera = estado.galera.filter((p) => p.nome);
  return (
    <>
      <div className="p-campo">
        <div className="p-rotulo">QUEM TÁ FALANDO</div>
        {galera.length > 0 ? (
          <div className="p-opcoes" style={{ gap: 6 }}>
            {galera.map((p) => (
              <button
                key={p.id}
                type="button"
                className={classeOpcao(estado.ltNome === p.nome, 'p-opcao--pessoa')}
                onClick={() => live.salvar({ ltNome: p.nome, funcao: p.funcao })}
              >
                {p.nome}
              </button>
            ))}
          </div>
        ) : (
          <div className="p-texto-dica">Cadastra a galera no botão GALERA lá em cima.</div>
        )}
      </div>
      <div className="p-duas">
        <CampoTexto rotulo="NOME" valor={estado.ltNome} maiusculo aoMudar={(v) => live.salvarDepois({ ltNome: v })} />
        <CampoTexto rotulo="FUNÇÃO / LEGENDA" valor={estado.funcao} maiusculo aoMudar={(v) => live.salvarDepois({ funcao: v })} />
      </div>
    </>
  );
}

const AJUSTES = [
  { rotulo: '−1 MIN', seg: -60 },
  { rotulo: '−10 S', seg: -10 },
  { rotulo: '+10 S', seg: 10 },
  { rotulo: '+1 MIN', seg: 60 },
];

// Ressincroniza o relógio com a transmissão: a conta é feita no banco, pela hora do servidor.
function AjusteRelogio({ live }: { live: Live }) {
  const [texto, setTexto] = useState('');
  const [invalido, setInvalido] = useState(false);

  function definir(e: React.FormEvent) {
    e.preventDefault();
    const seg = lerTempo(texto);
    if (seg == null) return setInvalido(true);
    live.relogio('definir', seg);
    setTexto('');
  }

  return (
    <>
      <div className="p-relogio__ajustes">
        {AJUSTES.map((a) => (
          <button key={a.rotulo} type="button" className="p-relogio__ajuste" onClick={() => live.relogio('ajustar', a.seg)}>
            {a.rotulo}
          </button>
        ))}
      </div>
      <form className="p-relogio__exato" onSubmit={definir}>
        <input
          className="p-input p-relogio__campo"
          aria-label="TEMPO EXATO"
          aria-invalid={invalido}
          inputMode="numeric"
          placeholder="MM:SS"
          maxLength={5}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setInvalido(false);
          }}
        />
        <button type="submit" className="p-botao-contorno">
          DEFINIR
        </button>
      </form>
    </>
  );
}
