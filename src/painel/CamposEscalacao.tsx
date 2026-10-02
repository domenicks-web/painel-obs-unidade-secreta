import type { useLive } from '../live/useLive';
import type { PatchLive } from '../live/tipos';
import { useTimes } from '../escalacao/useTimes';
import { prontoParaEscalar, titulares } from '../escalacao/times';
import { LISTA_FORMACOES, ROTULO_FORMACAO, formacaoOu, type EscModo, type EscTimes, type Formacao } from '../escalacao/layout';
import { modoEsc, timesEsc } from '../telas/TelaEscalacao';

type Live = ReturnType<typeof useLive>;

const MODOS: [EscModo, string][] = [['lista', 'LISTA'], ['campo', 'CAMPO']];
const TIMES: [EscTimes, string][] = [['casa', 'SÓ CASA'], ['ambos', 'CASA E VISITANTE'], ['visitante', 'SÓ VISITANTE']];

const AVISO_FORMACAO = 'Trocar a formação volta as posições arrastadas à mão para as da formação nova. Continuar?';

interface Props {
  live: Live;
  editandoPosicoes: boolean;
  aoEditarPosicoes: (v: boolean) => void;
  aoAbrirTimes: () => void;
}

// Modo, times, formações. Trocar modo ou times volta as câmeras pro layout automático daquele caso.
export function CamposEscalacao({ live, editandoPosicoes, aoEditarPosicoes, aoAbrirTimes }: Props) {
  const { estado, salvar } = live;
  const { times } = useTimes();
  const modo = modoEsc(estado.escModo);
  const quais = timesEsc(estado.escTimes);
  const lados = (quais === 'ambos' ? ['casa', 'visitante'] : [quais]) as ('casa' | 'visitante')[];
  const temManual = (lado: 'casa' | 'visitante') => !!(lado === 'casa' ? estado.escPosCasa : estado.escPosVisit);

  function escolherTime(lado: 'casa' | 'visitante', id: string) {
    const t = times.find((x) => x.id === id);
    const patch: PatchLive = lado === 'casa' ? { escTimeCasaId: id || null } : { escTimeVisitId: id || null };
    // o placar segue o nome do time escolhido (continua editável na tela FUTEBOL)
    if (t) Object.assign(patch, lado === 'casa' ? { timeA: t.nome } : { timeB: t.nome });
    salvar(patch);
  }

  function escolherFormacao(lado: 'casa' | 'visitante', f: Formacao) {
    if (temManual(lado) && !window.confirm(AVISO_FORMACAO)) return;
    salvar(lado === 'casa' ? { escFormCasa: f, escPosCasa: null } : { escFormVisit: f, escPosVisit: null });
  }

  return (
    <>
      <div className="p-esc-linha">
        <div className="p-campo">
          <div className="p-rotulo">ESCALAÇÃO</div>
          <div className="p-opcoes" role="group" aria-label="ESCALAÇÃO">
            {MODOS.map(([m, rot]) => (
              <button
                key={m}
                type="button"
                className={`p-opcao p-opcao--esc${modo === m ? ' p-opcao--ativa' : ''}`}
                aria-pressed={modo === m}
                onClick={() => {
                  if (m !== 'campo') aoEditarPosicoes(false);
                  salvar({ escModo: m, camsEscalacao: null });
                }}
              >
                {rot}
              </button>
            ))}
          </div>
        </div>
        <div className="p-campo">
          <div className="p-rotulo">TIMES</div>
          <div className="p-opcoes" role="group" aria-label="TIMES">
            {TIMES.map(([t, rot]) => (
              <button
                key={t}
                type="button"
                className={`p-opcao p-opcao--esc${quais === t ? ' p-opcao--ativa' : ''}`}
                aria-pressed={quais === t}
                onClick={() => salvar({ escTimes: t, camsEscalacao: null })}
              >
                {rot}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={lados.length === 2 ? 'p-esc-times p-esc-times--dois' : 'p-esc-times'}>
        {lados.map((lado) => {
          const casa = lado === 'casa';
          const id = (casa ? estado.escTimeCasaId : estado.escTimeVisitId) ?? '';
          const form = formacaoOu(casa ? estado.escFormCasa : estado.escFormVisit, casa ? '4-3-3' : '4-2-3-1');
          const sufixo = casa ? 'CASA' : 'VISITANTE';
          return (
            <div key={lado} className={`p-esc-time p-esc-time--${lado}`}>
              <label className="p-campo">
                <span className="p-rotulo">TIME {sufixo}</span>
                <select className="p-input p-select" value={id} onChange={(e) => escolherTime(lado, e.target.value)}>
                  <option value="">— ESCOLHA —</option>
                  {times.map((t) => {
                    const pronto = prontoParaEscalar(t);
                    return (
                      <option key={t.id} value={t.id} disabled={!pronto}>
                        {t.nome}
                        {pronto ? '' : ` (${titulares(t).length}/11 TITULARES)`}
                      </option>
                    );
                  })}
                </select>
              </label>
              <label className="p-campo">
                <span className="p-rotulo">FORMAÇÃO</span>
                <select className="p-input p-select" aria-label={`FORMAÇÃO ${sufixo}`} value={form} onChange={(e) => escolherFormacao(lado, e.target.value as Formacao)}>
                  {LISTA_FORMACOES.map((f) => (
                    <option key={f} value={f}>
                      {ROTULO_FORMACAO[f] ?? f}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          );
        })}
      </div>
      <div className="p-linha">
        <button type="button" className="p-botao-contorno" onClick={aoAbrirTimes}>
          CADASTRO DE TIMES
        </button>
        <div className="p-texto-dica">Placar e relógio: na tela FUTEBOL (são os mesmos).</div>
      </div>

      {modo === 'campo' && (
        <div className="p-linha">
          <div className="p-rotulo p-rotulo--grande">JOGADORES</div>
          <button
            type="button"
            className={editandoPosicoes ? 'p-chave p-chave--ligada' : 'p-chave'}
            aria-pressed={editandoPosicoes}
            onClick={() => aoEditarPosicoes(!editandoPosicoes)}
          >
            {editandoPosicoes ? '● EDITANDO POSIÇÕES' : 'EDITAR POSIÇÕES'}
          </button>
          {lados.map((lado) => (
            <button
              key={lado}
              type="button"
              className="p-botao-contorno"
              disabled={!temManual(lado)}
              onClick={() => salvar(lado === 'casa' ? { escPosCasa: null } : { escPosVisit: null })}
            >
              RESETAR FORMAÇÃO{lados.length === 2 ? (lado === 'casa' ? ' · CASA' : ' · VISITANTE') : ''}
            </button>
          ))}
          {editandoPosicoes && <div className="p-texto-dica">Arrasta as bolinhas na prévia. As câmeras ficam paradas enquanto isso.</div>}
        </div>
      )}
    </>
  );
}
