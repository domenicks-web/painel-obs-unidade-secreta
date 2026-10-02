import type { useLive } from '../live/useLive';
import { useTimes } from '../escalacao/useTimes';
import { acharTime, titulares } from '../escalacao/times';
import { CampoTexto } from './CampoTexto';
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
  aoAbrirTimes: (nome?: string) => void;
}

// Modo, times, formações. Trocar modo ou times volta as câmeras pro layout automático daquele caso.
export function CamposEscalacao({ live, editandoPosicoes, aoEditarPosicoes, aoAbrirTimes }: Props) {
  const { estado, salvar, salvarDepois } = live;
  const { times } = useTimes();
  const modo = modoEsc(estado.escModo);
  const quais = timesEsc(estado.escTimes);
  const lados = (quais === 'ambos' ? ['casa', 'visitante'] : [quais]) as ('casa' | 'visitante')[];
  const temManual = (lado: 'casa' | 'visitante') => !!(lado === 'casa' ? estado.escPosCasa : estado.escPosVisit);

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
          const nome = casa ? estado.timeA : estado.timeB;
          const time = acharTime(times, nome);
          const nTit = time ? titulares(time).length : 0;
          const form = formacaoOu(casa ? estado.escFormCasa : estado.escFormVisit, casa ? '4-3-3' : '4-2-3-1');
          const sufixo = casa ? 'CASA' : 'VISITANTE';
          return (
            <div key={lado} className={`p-esc-time p-esc-time--${lado}`}>
              <CampoTexto
                rotulo={`TIME ${sufixo}`}
                valor={nome}
                maiusculo
                sugestoes="p-esc-sugestoes"
                placeholder="DIGITA O NOME"
                aoMudar={(v) => salvarDepois(casa ? { timeA: v } : { timeB: v })}
              />
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
              <div className="p-esc-elenco">
                {!nome.trim() ? (
                  <span className="p-texto-dica">Escreve o nome do time (vai pro placar também).</span>
                ) : time ? (
                  <>
                    <span className={nTit === 11 ? 'p-esc-elenco__ok' : 'p-esc-elenco__falta'}>
                      {nTit === 11 ? 'ELENCO CADASTRADO' : `ELENCO COM ${nTit}/11 TITULARES`}
                    </span>
                    <button type="button" className="p-botao-contorno p-esc-elenco__botao" onClick={() => aoAbrirTimes(time.nome)}>
                      EDITAR ELENCO
                    </button>
                  </>
                ) : (
                  <>
                    <span className="p-esc-elenco__falta">SEM ELENCO CADASTRADO</span>
                    <button type="button" className="p-botao-contorno p-esc-elenco__botao" onClick={() => aoAbrirTimes(nome)}>
                      + CADASTRAR ELENCO
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <datalist id="p-esc-sugestoes">
        {times.map((t) => (
          <option key={t.id} value={t.nome} />
        ))}
      </datalist>
      <div className="p-linha">
        <button type="button" className="p-botao-contorno" onClick={() => aoAbrirTimes()}>
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
