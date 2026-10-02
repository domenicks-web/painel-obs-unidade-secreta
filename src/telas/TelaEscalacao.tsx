import type { PropsTela } from './tipos';
import type { EstadoLive } from '../live/tipos';
import { Molduras } from './SlotCamera';
import { FaixaTicker } from './FaixaTicker';
import { ChatFutebol, PlacarFutebol } from './PlacarFutebol';
import { useTimes } from '../escalacao/useTimes';
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
  manual: Ponto[] | null;
}

export const modoEsc = (v: unknown): EscModo => (v === 'campo' ? 'campo' : 'lista');
export const timesEsc = (v: unknown): EscTimes => (v === 'ambos' || v === 'visitante' ? v : 'casa');

/** Times em uso na escalação, já com formação, cor e posições manuais válidas. */
export function timesEscalados(estado: EstadoLive, cadastro: Time[]): TimeEscalado[] {
  const quais = timesEsc(estado.escTimes);
  const lados: Lado[] = quais === 'ambos' ? ['casa', 'visitante'] : [quais];
  return lados.map((lado) => {
    const casa = lado === 'casa';
    const nome = casa ? estado.timeA : estado.timeB;
    const time = acharTime(cadastro, nome);
    return {
      lado,
      nome,
      tecnico: time?.tecnico ?? '',
      cor: casa ? COR_CASA : COR_VISITANTE,
      formacao: formacaoOu(casa ? estado.escFormCasa : estado.escFormVisit, casa ? '4-3-3' : '4-2-3-1'),
      jogadores: time ? titulares(time).slice(0, 11) : [],
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

  return (
    <div className="t-futebol">
      <div className="t-futebol__gramado" />
      <PlacarFutebol estado={estado} />
      {est.escModo === 'lista' ? <Lista escalados={escalados} quais={est.escTimes} /> : <Campo escalados={escalados} ambos={ambos} />}
      <Molduras estado={est} tela="escalacao" previa={previa} />
      <ChatFutebol previa={previa} />
      <FaixaTicker ticker={estado.ticker} />
    </div>
  );
}

function Lista({ escalados, quais }: { escalados: TimeEscalado[]; quais: EscTimes }) {
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
            {linhas(t.jogadores, t.formacao).map((l, li) => (
              <div key={li} className="t-esc-coluna__linha">
                {l.map((j, ji) => (
                  <div key={ji} className="t-esc-jogador">
                    <div className="t-esc-jogador__num" style={{ boxShadow: `inset 0 0 0 2px ${t.cor}`, color: t.cor }}>
                      {j.numero}
                    </div>
                    <div className="t-esc-jogador__nome">{j.nome}</div>
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

function Campo({ escalados, ambos }: { escalados: TimeEscalado[]; ambos: boolean }) {
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
          return t.jogadores.map((j, i) => (
            <div key={`${t.lado}-${i}`} className="t-esc-token" style={{ left: Math.round(centros[i].x - 75), top: Math.round(centros[i].y - 23) }}>
              <div className="t-esc-token__bola" style={{ background: t.cor }}>
                {j.numero}
              </div>
              <div className="t-esc-token__nome" style={{ maxWidth: larguraNome(ambos) }}>
                {j.nome}
              </div>
            </div>
          ));
        })}
      </div>
    </>
  );
}
