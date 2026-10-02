import { useCallback, useState } from 'react';
import type { useLive } from '../live/useLive';
import { useTimes } from '../escalacao/useTimes';
import { acharTime } from '../escalacao/times';
import { segundosJogo } from '../live/relogios';
import { useOffsetServidor } from '../live/relogioServidor';
import { timesEscalados, type TimeEscalado } from '../telas/TelaEscalacao';
import {
  MAX_LANCES,
  lerPessoa,
  minutoDoJogo,
  sanitizarLances,
  textoLance,
  type Lance,
  type LadoLance,
  type Pessoa,
  type TipoLance,
} from '../escalacao/lances';
import { COR_AMARELO, COR_VERMELHO, SeloCartao, SeloGol, SeloSub } from '../escalacao/Selos';
import { Modal } from './Modal';

type Live = ReturnType<typeof useLive>;

const TITULO: Record<TipoLance, string> = { gol: 'GOL', amarelo: 'CARTÃO AMARELO', vermelho: 'CARTÃO VERMELHO', sub: 'SUBSTITUIÇÃO' };

function Icone({ tipo, tam = 20 }: { tipo: TipoLance; tam?: number }) {
  if (tipo === 'gol') return <SeloGol tam={tam} />;
  if (tipo === 'sub') return <SeloSub tam={tam} />;
  return <SeloCartao cor={tipo === 'vermelho' ? COR_VERMELHO : COR_AMARELO} tam={tam} />;
}

// Gol, cartão e substituição: um botão por tipo (abre o modal com os jogadores em campo) e a lista
// dos lances do jogo. Aparecem na ESCALAÇÃO (selos nas bolinhas e aviso no topo do campo).
export function Lances({ live }: { live: Live }) {
  const { estado, salvar } = live;
  const [tipo, setTipo] = useState<TipoLance | null>(null);
  const fechar = useCallback(() => setTipo(null), []);
  const lances = sanitizarLances(estado.escLances);

  function desfazer(l: Lance) {
    if (l.tipo === 'gol') {
      const time = l.lado === 'casa' ? estado.timeA : estado.timeB;
      if (window.confirm(`Tirar esse gol? Também tira 1 do placar do ${time}.`)) live.gol(l.lado === 'casa' ? 'A' : 'B', -1);
      else return;
    }
    salvar({ escLances: lances.filter((x) => x.id !== l.id) });
  }

  return (
    <div className="p-lances">
      <div className="p-lances__cabeca">
        <div className="p-rotulo p-rotulo--grande">LANCES</div>
        <div className="p-lances__botoes">
          {(['gol', 'amarelo', 'vermelho', 'sub'] as const).map((t) => (
            <button key={t} type="button" className={`p-lance-botao p-lance-botao--${t}`} onClick={() => setTipo(t)}>
              <span aria-hidden className="p-lance-botao__icone">
                <Icone tipo={t} />
              </span>
              {t === 'gol' ? 'GOL' : t === 'amarelo' ? 'AMARELO' : t === 'vermelho' ? 'VERMELHO' : 'SUBSTITUIÇÃO'}
            </button>
          ))}
        </div>
      </div>
      {lances.length > 0 ? (
        <div className="p-lances__lista">
          {[...lances].reverse().map((l) => (
            <div key={l.id} className={`p-lance p-lance--${l.lado}`}>
              <span aria-hidden className="p-lance-botao__icone">
                <Icone tipo={l.tipo} tam={18} />
              </span>
              <span className="p-lance__texto">{textoLance(l)}</span>
              <button type="button" className="p-lance__tirar" aria-label={`Desfazer ${textoLance(l)}`} onClick={() => desfazer(l)}>
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="p-botao-contorno p-lances__limpar"
            onClick={() => window.confirm('Limpar todos os lances (novo jogo)? O placar não muda.') && salvar({ escLances: [] })}
          >
            LIMPAR LANCES
          </button>
        </div>
      ) : (
        <div className="p-texto-dica">Nenhum lance ainda. Eles aparecem na ESCALAÇÃO: selo na bolinha e aviso no topo do campo.</div>
      )}
      {tipo && <ModalLance tipo={tipo} live={live} aoFechar={fechar} />}
    </div>
  );
}

interface Escolha {
  lado: LadoLance;
  slot: number;
  pessoa: Pessoa;
}

function ModalLance({ tipo, live, aoFechar }: { tipo: TipoLance; live: Live; aoFechar: () => void }) {
  const { estado, salvar } = live;
  const { times } = useTimes();
  const offset = useOffsetServidor();
  const [somar, setSomar] = useState(true);
  const [saindo, setSaindo] = useState<Escolha | null>(null);
  // os dois times sempre (dá pra registrar lance de quem não está na escalação)
  const escalados = timesEscalados({ ...estado, escTimes: 'ambos' }, times);
  const lances = sanitizarLances(estado.escLances);

  function registrar(e: Escolha, entra?: Pessoa) {
    const agora = Date.now() + offset;
    const parado = !estado.clockRodando && !Number(estado.clockAcumulado);
    const novo: Lance = {
      id: crypto.randomUUID(),
      lado: e.lado,
      tipo,
      slot: e.slot,
      numero: e.pessoa.numero,
      nome: e.pessoa.nome,
      ...(entra ? { entra } : {}),
      minuto: parado ? null : minutoDoJogo(segundosJogo(estado, agora)),
      em: agora,
    };
    salvar({ escLances: [...lances, novo].slice(-MAX_LANCES) });
    if (tipo === 'gol' && somar) live.gol(e.lado === 'casa' ? 'A' : 'B', 1);
    aoFechar();
  }

  function escolher(e: Escolha) {
    if (tipo === 'sub') setSaindo(e);
    else registrar(e);
  }

  const minuto = estado.clockRodando || Number(estado.clockAcumulado) ? `${minutoDoJogo(segundosJogo(estado, Date.now() + offset))}'` : 'SEM RELÓGIO';
  return (
    <Modal titulo={TITULO[tipo]} extra={minuto} aoFechar={aoFechar} largo>
      {tipo === 'gol' && (
        <button type="button" className={somar ? 'p-chave p-chave--ligada' : 'p-chave'} aria-pressed={somar} onClick={() => setSomar(!somar)}>
          {somar ? '● SOMA 1 NO PLACAR (COM A ANIMAÇÃO)' : '○ SÓ MARCA QUEM FEZ (PLACAR JÁ ESTÁ CERTO)'}
        </button>
      )}
      {tipo === 'sub' && saindo ? (
        <Entrando escalado={escalados.find((t) => t.lado === saindo.lado)!} saindo={saindo} aoVoltar={() => setSaindo(null)} aoEscolher={(p) => registrar(saindo, p)} />
      ) : (
        <>
          {tipo === 'sub' && <div className="p-texto-dica">Primeiro quem SAI.</div>}
          <div className="p-lance-times">
            {escalados.map((t) => (
              <ColunaTime key={t.lado} t={t} aoEscolher={escolher} />
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}

function ColunaTime({ t, aoEscolher }: { t: TimeEscalado; aoEscolher: (e: Escolha) => void }) {
  return (
    <div className={`p-lance-time p-lance-time--${t.lado}`}>
      <div className="p-lance-time__nome">{t.nome || (t.lado === 'casa' ? 'CASA' : 'VISITANTE')}</div>
      <div className="p-lance-time__jogadores">
        {t.ocupantes.map((o) => (
          <button key={o.slot} type="button" className="p-lance-jogador" disabled={o.expulso} onClick={() => aoEscolher({ lado: t.lado, slot: o.slot, pessoa: o })}>
            <span className="p-lance-jogador__num">{o.numero}</span>
            <span className="p-lance-jogador__nome">{o.nome}</span>
          </button>
        ))}
        {t.ocupantes.length === 0 && <div className="p-texto-dica">Sem elenco cadastrado com esse nome.</div>}
      </div>
      <OutroJogador rotulo={`OUTRO JOGADOR · ${t.nome || t.lado.toUpperCase()}`} aoUsar={(p) => aoEscolher({ lado: t.lado, slot: -1, pessoa: p })} />
    </div>
  );
}

function Entrando({ escalado, saindo, aoVoltar, aoEscolher }: { escalado: TimeEscalado; saindo: Escolha; aoVoltar: () => void; aoEscolher: (p: Pessoa) => void }) {
  const { times } = useTimes();
  const time = acharTime(times, escalado.nome);
  const emCampo = escalado.ocupantes;
  // banco: reservas do cadastro que ainda não entraram
  const banco = (time?.jogadores ?? []).filter((j) => !j.titular && !emCampo.some((o) => o.numero === j.numero && o.nome === j.nome));
  return (
    <div className={`p-lance-time p-lance-time--${saindo.lado}`}>
      <div className="p-lance-time__nome">
        SAI {saindo.pessoa.numero} {saindo.pessoa.nome.toUpperCase()} · QUEM ENTRA?
      </div>
      <div className="p-lance-time__jogadores">
        {banco.map((j) => (
          <button key={`${j.numero}-${j.nome}`} type="button" className="p-lance-jogador" onClick={() => aoEscolher({ numero: j.numero, nome: j.nome })}>
            <span className="p-lance-jogador__num">{j.numero}</span>
            <span className="p-lance-jogador__nome">{j.nome}</span>
          </button>
        ))}
        {banco.length === 0 && <div className="p-texto-dica">Sem reservas no cadastro. Escreve quem entra aqui embaixo.</div>}
      </div>
      <OutroJogador rotulo="QUEM ENTRA (NÚMERO E NOME)" aoUsar={aoEscolher} />
      <button type="button" className="p-botao-contorno" onClick={aoVoltar}>
        ← VOLTAR
      </button>
    </div>
  );
}

function OutroJogador({ rotulo, aoUsar }: { rotulo: string; aoUsar: (p: Pessoa) => void }) {
  const [texto, setTexto] = useState('');
  const pessoa = lerPessoa(texto);
  return (
    <form
      className="p-lance-outro"
      onSubmit={(e) => {
        e.preventDefault();
        if (pessoa) aoUsar(pessoa);
      }}
    >
      <label className="p-campo">
        <span className="p-rotulo">{rotulo}</span>
        <input className="p-input p-input--livre" placeholder="NÚMERO E NOME (EX.: 9 PEDRO)" value={texto} onChange={(e) => setTexto(e.target.value)} />
      </label>
      <button type="submit" className="p-botao" disabled={!pessoa}>
        OK
      </button>
    </form>
  );
}
