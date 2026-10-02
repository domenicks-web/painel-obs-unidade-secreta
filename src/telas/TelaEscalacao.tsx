import { useEffect, useState } from 'react';
import type { PropsTela } from './tipos';
import type { EstadoLive } from '../live/tipos';
import { Molduras } from './SlotCamera';
import { FaixaTicker } from './FaixaTicker';
import { ChatFutebol, PlacarFutebol } from './PlacarFutebol';
import { useTimes } from '../escalacao/useTimes';
import { useOffsetServidor } from '../live/relogioServidor';
import { AVISO_MS, lanceRecente, ocupantes, sanitizarLances, textoLance, type Lance, type Ocupante } from '../escalacao/lances';
import { COR_AMARELO, COR_VERMELHO, SeloCartao, SeloGol, SeloSub } from '../escalacao/Selos';
import { acharTime, titulares, type Jogador, type Time } from '../escalacao/times';
import {
  CAMPO,
  COR_CASA,
  COR_VISITANTE,
  centrosNoCampo,
  colunasLista,
  formacaoOu,
  larguraNome,
  linhas,
  sanitizarPosicoes,
  type EscModo,
  type EscTimes,
  type Formacao,
  type Ponto,
} from '../escalacao/layout';

export type Lado = 'casa' | 'visitante';

export interface TimeEscalado {
  lado: Lado;
  nome: string;
  tecnico: string;
  cor: string;
  formacao: Formacao;
  /** titulares na ordem do cadastro (goleiro primeiro); até 11 */
  jogadores: Jogador[];
  /** quem está em campo agora em cada slot (com as substituições) e os lances de cada um */
  ocupantes: Ocupante[];
  manual: Ponto[] | null;
}

export const modoEsc = (v: unknown): EscModo => (v === 'campo' ? 'campo' : 'lista');
export const timesEsc = (v: unknown): EscTimes => (v === 'ambos' || v === 'visitante' ? v : 'casa');

/** Times em uso na escalação, já com formação, cor e posições manuais válidas. */
export function timesEscalados(estado: EstadoLive, cadastro: Time[]): TimeEscalado[] {
  const quais = timesEsc(estado.escTimes);
  const lances = sanitizarLances(estado.escLances);
  const lados: Lado[] = quais === 'ambos' ? ['casa', 'visitante'] : [quais];
  return lados.map((lado) => {
    const casa = lado === 'casa';
    const nome = casa ? estado.timeA : estado.timeB;
    const time = acharTime(cadastro, nome);
    const jogadores = time ? titulares(time).slice(0, 11) : [];
    return {
      lado,
      nome,
      tecnico: time?.tecnico ?? '',
      cor: casa ? COR_CASA : COR_VISITANTE,
      formacao: formacaoOu(casa ? estado.escFormCasa : estado.escFormVisit, casa ? '4-3-3' : '4-2-3-1'),
      jogadores,
      ocupantes: ocupantes(jogadores, lances, lado),
      manual: sanitizarPosicoes(casa ? estado.escPosCasa : estado.escPosVisit),
    };
  });
}

export function TelaEscalacao({ estado, previa }: PropsTela) {
  const { times } = useTimes();
  const escalados = timesEscalados(estado, times);
  const ambos = escalados.length === 2;
  // as câmeras seguem o modo e os times mesmo com o estado antigo (sem as chaves esc*)
  const est = { ...estado, escModo: modoEsc(estado.escModo), escTimes: timesEsc(estado.escTimes) };
  const recente = useLanceRecente(sanitizarLances(estado.escLances));

  return (
    <div className="t-futebol">
      <div className="t-futebol__gramado" />
      <PlacarFutebol estado={estado} />
      {est.escModo === 'lista' ? (
        <Lista escalados={escalados} quais={est.escTimes} recente={recente} />
      ) : (
        <Campo escalados={escalados} ambos={ambos} recente={recente} />
      )}
      <Molduras estado={est} tela="escalacao" previa={previa} />
      <ChatFutebol previa={previa} />
      <FaixaTicker ticker={estado.ticker} />
    </div>
  );
}

function Lista({ escalados, quais, recente }: { escalados: TimeEscalado[]; quais: EscTimes; recente: Lance | null }) {
  const colunas = colunasLista(quais);
  return (
    <>
      {escalados.map((t, i) => (
        <div key={t.lado} className="t-esc-coluna" style={{ left: colunas[i].x, width: colunas[i].w }}>
          <div className="t-esc-coluna__cabeca" style={{ background: t.cor }}>
            <div className="t-esc-coluna__nome">{t.nome}</div>
            <div className="t-esc-coluna__esquema">{t.formacao}</div>
          </div>
          <div className="t-esc-coluna__linhas">
            {linhas(t.ocupantes, t.formacao).map((l, li) => (
              <div key={li} className="t-esc-coluna__linha">
                {l.map((j, ji) => (
                  <div key={ji} className={classeJogador('t-esc-jogador', j, recente)}>
                    <div className="t-esc-jogador__num" style={{ boxShadow: `inset 0 0 0 2px ${t.cor}`, color: t.cor }}>
                      {j.numero}
                    </div>
                    <div className="t-esc-jogador__nome">{j.nome}</div>
                    <SelosLista o={j} />
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="t-esc-coluna__tec">
            <div className="t-esc-coluna__tec-rotulo" style={{ color: t.cor }}>
              TÉC
            </div>
            <div className="t-esc-coluna__tec-nome">{t.tecnico}</div>
          </div>
        </div>
      ))}
    </>
  );
}

function Campo({ escalados, ambos, recente }: { escalados: TimeEscalado[]; ambos: boolean; recente: Lance | null }) {
  return (
    <>
      {escalados.map((t) => {
        const direita = ambos && t.lado === 'visitante';
        return (
          <div key={t.lado} className={direita ? 't-esc-faixa t-esc-faixa--direita' : 't-esc-faixa'} style={{ left: direita ? 740 : 60 }}>
            <div className="t-esc-faixa__cor" style={{ background: t.cor }} />
            <div className="t-esc-faixa__nome">{t.nome}</div>
            <div className="t-esc-faixa__esquema" style={{ color: t.cor }}>
              {t.formacao}
            </div>
            <div className="t-esc-faixa__tec">TÉC {t.tecnico}</div>
          </div>
        );
      })}
      <div className="t-esc-campo" style={{ left: CAMPO.x, top: CAMPO.y, width: CAMPO.w, height: CAMPO.h }}>
        <div className="t-esc-campo__borda" />
        <div className="t-esc-campo__meio" />
        <div className="t-esc-campo__circulo" />
        <div className="t-esc-campo__area t-esc-campo__area--esq" />
        <div className="t-esc-campo__area t-esc-campo__area--dir" />
        <div className="t-esc-campo__pequena t-esc-campo__pequena--esq" />
        <div className="t-esc-campo__pequena t-esc-campo__pequena--dir" />
        {escalados.map((t) => {
          const centros = centrosNoCampo(t.formacao, t.manual, ambos, t.lado);
          return t.ocupantes.map((j, i) => (
            <div key={`${t.lado}-${i}`} className={classeJogador('t-esc-token', j, recente)} style={{ left: Math.round(centros[i].x - 75), top: Math.round(centros[i].y - 23) }}>
              <div className="t-esc-token__bola" style={{ background: t.cor }}>
                {j.numero}
                <SelosCampo o={j} />
              </div>
              <div className="t-esc-token__nome" style={{ maxWidth: larguraNome(ambos) }}>
                {j.nome}
              </div>
            </div>
          ));
        })}
        {recente && <AvisoLance key={recente.id} lance={recente} cor={recente.lado === 'casa' ? COR_CASA : COR_VISITANTE} />}
      </div>
    </>
  );
}

/** Lance mais novo enquanto o aviso vale (8 s pela hora do servidor); some sozinho depois. */
function useLanceRecente(lances: Lance[]): Lance | null {
  const offset = useOffsetServidor();
  const [, redesenhar] = useState(0);
  const recente = lanceRecente(lances, Date.now() + offset);
  const id = recente?.id;
  const em = recente?.em ?? 0;
  useEffect(() => {
    if (!id) return;
    const t = setTimeout(() => redesenhar((n) => n + 1), Math.max(0, AVISO_MS - (Date.now() + offset - em)) + 50);
    return () => clearTimeout(t);
  }, [id, em, offset]);
  return recente;
}

function classeJogador(base: string, o: Ocupante, recente: Lance | null) {
  let c = base;
  if (o.expulso) c += ` ${base}--expulso`;
  if (recente && o.ultimo === recente.id) c += ` ${base}--lance`;
  return c;
}

function Cartoes({ o, tam }: { o: Ocupante; tam: number }) {
  return (
    <>
      {o.amarelos > 0 && <SeloCartao cor={COR_AMARELO} tam={tam} />}
      {(o.vermelho || o.amarelos >= 2) && <SeloCartao cor={COR_VERMELHO} tam={tam} />}
    </>
  );
}

function SelosCampo({ o }: { o: Ocupante }) {
  return (
    <>
      {o.gols > 0 && (
        <span className="t-esc-selo t-esc-selo--gol">
          <SeloGol tam={30} />
          {o.gols > 1 && <span className="t-esc-selo__conta">{o.gols}</span>}
        </span>
      )}
      {(o.amarelos > 0 || o.vermelho) && (
        <span className="t-esc-selo t-esc-selo--cartao">
          <Cartoes o={o} tam={28} />
        </span>
      )}
      {o.entrou && (
        <span className="t-esc-selo t-esc-selo--sub">
          <SeloSub tam={28} />
        </span>
      )}
    </>
  );
}

function SelosLista({ o }: { o: Ocupante }) {
  if (!o.gols && !o.amarelos && !o.vermelho && !o.entrou) return null;
  return (
    <div className="t-esc-jogador__selos">
      {o.entrou && <SeloSub tam={24} />}
      {Array.from({ length: Math.min(o.gols, 4) }, (_, i) => (
        <SeloGol key={i} tam={24} />
      ))}
      <Cartoes o={o} tam={24} />
    </div>
  );
}

function AvisoLance({ lance, cor }: { lance: Lance; cor: string }) {
  return (
    <div className="t-esc-aviso" style={{ boxShadow: `inset 0 0 0 3px ${cor}` }}>
      <span className="t-esc-aviso__icone">
        {lance.tipo === 'gol' ? (
          <SeloGol tam={28} />
        ) : lance.tipo === 'sub' ? (
          <SeloSub tam={28} />
        ) : (
          <SeloCartao cor={lance.tipo === 'vermelho' ? COR_VERMELHO : COR_AMARELO} tam={28} />
        )}
      </span>
      <span className="t-esc-aviso__texto">{textoLance(lance)}</span>
    </div>
  );
}
