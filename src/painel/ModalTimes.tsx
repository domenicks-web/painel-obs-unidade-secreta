import { useEffect, useState } from 'react';
import { useTimes } from '../escalacao/useTimes';
import { useConfirmar } from './Confirmar';
import { MAX_ELENCO, TITULARES, acharTime, lerElenco, renumerar, type Jogador, type Time } from '../escalacao/times';

type Rascunho = Omit<Time, 'id'> & { id: string | null };

const NOVO: Rascunho = { id: null, nome: '', sigla: '', tecnico: '', cor: null, jogadores: [] };

// Cadastro de times: a lista à esquerda, o time aberto à direita. O time é gravado inteiro no
// SALVAR (nome, técnico e elenco numa transação só), não a cada tecla.
// abrirNome: vem da ESCALAÇÃO — abre o time com esse nome, ou um time novo já com o nome preenchido.
export function ModalTimes({ aoFechar, abrirNome }: { aoFechar: () => void; abrirNome?: string }) {
  const { times, salvarTime, excluirTime } = useTimes();
  const [inicial] = useState(() => {
    if (!abrirNome?.trim()) return null;
    const t = acharTime(times, abrirNome);
    return t ? { r: { ...t, jogadores: renumerar(t.jogadores) }, novo: false } : { r: { ...NOVO, nome: abrirNome.trim().toUpperCase() }, novo: true };
  });
  const [rascunho, setRascunho] = useState<Rascunho | null>(inicial?.r ?? null);
  const [mexido, setMexido] = useState(!!inicial?.novo);
  const [erro, setErro] = useState('');
  const [gravando, setGravando] = useState(false);
  const [colando, setColando] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && fechar();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const confirmar = useConfirmar();
  const descartar = async () =>
    !mexido ||
    confirmar({ titulo: 'DESCARTAR MUDANÇAS?', texto: 'Tem mudança sem salvar nesse time.', sim: 'DESCARTAR', nao: 'CONTINUAR EDITANDO', tom: 'perigo' });

  async function fechar() {
    if (await descartar()) aoFechar();
  }

  async function abrir(t: Rascunho) {
    if (!(await descartar())) return;
    setRascunho({ ...t, jogadores: renumerar(t.jogadores) });
    setMexido(false);
    setErro('');
    setColando(null);
  }

  function mudar(parcial: Partial<Rascunho>) {
    setRascunho((r) => (r ? { ...r, ...parcial } : r));
    setMexido(true);
  }

  const elenco = rascunho?.jogadores ?? [];
  const nTit = elenco.filter((j) => j.titular).length;
  const mudarElenco = (lista: Jogador[]) => mudar({ jogadores: renumerar(lista) });
  const mudarJogador = (i: number, p: Partial<Jogador>) => mudarElenco(elenco.map((j, k) => (k === i ? { ...j, ...p } : j)));

  function mover(de: number, para: number) {
    if (para < 0 || para >= elenco.length || de === para) return;
    const lista = [...elenco];
    const [j] = lista.splice(de, 1);
    lista.splice(para, 0, j);
    // titular continua na parte de cima: pra trocar de grupo é o botão TITULAR/RESERVA
    mudarElenco(lista);
  }

  async function salvar() {
    if (!rascunho) return;
    if (!rascunho.nome.trim()) return setErro('Dá um nome pro time.');
    if (elenco.some((j) => !j.nome.trim())) return setErro('Tem jogador sem nome.');
    setGravando(true);
    const falha = await salvarTime(rascunho);
    setGravando(false);
    if (falha) return setErro(falha);
    setMexido(false);
    setErro('');
    if (!rascunho.id) setRascunho(null);
  }

  async function excluir() {
    if (!rascunho?.id) return;
    const ok = await confirmar({
      titulo: 'EXCLUIR TIME?',
      texto: (
        <>
          <b>{rascunho.nome}</b> e o elenco inteiro somem do cadastro. Não dá pra desfazer.
        </>
      ),
      sim: 'EXCLUIR',
      tom: 'perigo',
    });
    if (!ok) return;
    const falha = await excluirTime(rascunho.id);
    if (falha) return setErro(falha);
    setMexido(false);
    setRascunho(null);
  }

  function aplicarColagem() {
    const { jogadores, ignoradas } = lerElenco(colando ?? '');
    if (jogadores.length === 0) return setErro('Nenhuma linha no formato "numero nome".');
    mudarElenco(jogadores);
    setColando(null);
    setErro(ignoradas.length ? `Linhas ignoradas: ${ignoradas.slice(0, 3).join(' · ')}${ignoradas.length > 3 ? '…' : ''}` : '');
  }

  return (
    <div className="p-modal-fundo" onClick={fechar}>
      <div className="p-modal p-modal--times" role="dialog" aria-modal="true" aria-label="TIMES" onClick={(e) => e.stopPropagation()}>
        <div className="p-modal__listra" />
        <div className="p-modal__cabeca">
          <div className="p-modal__titulo">TIMES</div>
          <div className="p-modal__contador">{times.length} CADASTRADOS</div>
        </div>
        <div className="p-times">
          <div className="p-times__lista">
            {times.map((t) => {
              const n = t.jogadores.filter((j) => j.titular).length;
              return (
                <button
                  key={t.id}
                  type="button"
                  className={rascunho?.id === t.id ? 'p-times__item p-times__item--ativo' : 'p-times__item'}
                  onClick={() => abrir(t)}
                >
                  <span className="p-times__item-nome">{t.nome}</span>
                  <span className={n === TITULARES ? 'p-times__item-conta' : 'p-times__item-conta p-times__item-conta--falta'}>
                    {n}/{TITULARES}
                  </span>
                </button>
              );
            })}
            {times.length === 0 && <div className="p-vazio">Nenhum time ainda.</div>}
            <button type="button" className="p-botao" onClick={() => abrir(NOVO)}>
              + NOVO TIME
            </button>
          </div>

          <div className="p-times__editor">
            {!rascunho ? (
              <div className="p-vazio">Escolhe um time na lista ou cria um novo.</div>
            ) : (
              <>
                <div className="p-times__dados">
                  <label className="p-campo">
                    <span className="p-rotulo">NOME</span>
                    <input className="p-input" maxLength={40} value={rascunho.nome} onChange={(e) => mudar({ nome: e.target.value.toUpperCase() })} />
                  </label>
                  <label className="p-campo">
                    <span className="p-rotulo">TÉCNICO</span>
                    <input className="p-input p-input--livre" maxLength={40} value={rascunho.tecnico} onChange={(e) => mudar({ tecnico: e.target.value })} />
                  </label>
                </div>
                <div className="p-times__elenco-cabeca">
                  <div className="p-rotulo">ELENCO</div>
                  <div className={nTit === TITULARES ? 'p-times__conta' : 'p-times__conta p-times__conta--falta'} aria-label="TITULARES">
                    {nTit}/{TITULARES} TITULARES
                  </div>
                  <button type="button" className="p-botao-contorno" onClick={() => setColando(colando == null ? '' : null)}>
                    COLAR ELENCO
                  </button>
                </div>
                {nTit !== TITULARES && <div className="p-texto-dica">Precisa de exatamente 11 titulares pra usar o time na escalação.</div>}
                {colando != null && (
                  <div className="p-times__colar">
                    <textarea
                      className="p-input p-input--livre p-times__textarea"
                      aria-label="ELENCO PRA COLAR"
                      placeholder={'1 Alisson\n2 Vanderson\n4 Marquinhos\n…'}
                      value={colando}
                      onChange={(e) => setColando(e.target.value)}
                    />
                    <div className="p-texto-dica">Uma linha por jogador: número e nome. As 11 primeiras viram titulares (goleiro primeiro). Troca o elenco inteiro.</div>
                    <button type="button" className="p-botao" onClick={aplicarColagem}>
                      USAR ESSA LISTA
                    </button>
                  </div>
                )}
                <div className="p-times__jogadores">
                  {elenco.map((j, i) => (
                    <div
                      key={i}
                      className={`p-times__jogador${j.titular ? ' p-times__jogador--titular' : ''}${arrastando === i ? ' p-times__jogador--arrastando' : ''}`}
                      draggable
                      onDragStart={(e) => {
                        setArrastando(i);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (arrastando != null) mover(arrastando, i);
                        setArrastando(null);
                      }}
                      onDragEnd={() => setArrastando(null)}
                    >
                      <span className="p-times__alca" title="Arrasta pra mudar a ordem">⋮⋮</span>
                      <span className="p-times__pos">{j.titular ? (i === 0 ? 'GOL' : i + 1) : 'RES'}</span>
                      <input
                        className="p-input p-times__numero"
                        aria-label={`NÚMERO ${i + 1}`}
                        inputMode="numeric"
                        value={String(j.numero)}
                        onChange={(e) => mudarJogador(i, { numero: Math.min(999, Number(e.target.value.replace(/\D/g, '')) || 0) })}
                      />
                      <input
                        className="p-input p-input--livre p-times__nome"
                        aria-label={`NOME ${i + 1}`}
                        maxLength={30}
                        value={j.nome}
                        onChange={(e) => mudarJogador(i, { nome: e.target.value })}
                      />
                      <button
                        type="button"
                        className={j.titular ? 'p-times__tit p-times__tit--sim' : 'p-times__tit'}
                        aria-pressed={j.titular}
                        disabled={!j.titular && nTit >= TITULARES}
                        onClick={() => mudarJogador(i, { titular: !j.titular })}
                      >
                        {j.titular ? 'TITULAR' : 'RESERVA'}
                      </button>
                      <button type="button" className="p-botao-icone" aria-label={`Subir ${j.nome}`} disabled={i === 0} onClick={() => mover(i, i - 1)}>
                        ↑
                      </button>
                      <button type="button" className="p-botao-icone" aria-label={`Descer ${j.nome}`} disabled={i === elenco.length - 1} onClick={() => mover(i, i + 1)}>
                        ↓
                      </button>
                      <button type="button" className="p-botao-icone" aria-label={`Remover ${j.nome}`} onClick={() => mudarElenco(elenco.filter((_, k) => k !== i))}>
                        ×
                      </button>
                    </div>
                  ))}
                  {elenco.length === 0 && <div className="p-vazio">Sem jogadores. Adiciona um por um ou cola o elenco.</div>}
                </div>
                <button
                  type="button"
                  className="p-botao-contorno"
                  disabled={elenco.length >= MAX_ELENCO}
                  onClick={() =>
                    mudarElenco([...elenco, { numero: 0, nome: '', titular: nTit < TITULARES, ordem: elenco.length + 1 }])
                  }
                >
                  + JOGADOR
                </button>
                {erro && (
                  <div className="p-times__erro" role="alert">
                    {erro}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <div className="p-modal__rodape">
          {rascunho?.id && (
            <button type="button" className="p-botao p-botao--escuro p-times__excluir" onClick={excluir}>
              EXCLUIR TIME
            </button>
          )}
          {rascunho && (
            <button type="button" className="p-botao" disabled={gravando || !mexido} onClick={salvar}>
              {gravando ? 'SALVANDO…' : mexido ? 'SALVAR' : 'SALVO'}
            </button>
          )}
          <button type="button" className="p-botao p-botao--escuro" onClick={fechar}>
            FECHAR
          </button>
        </div>
      </div>
    </div>
  );
}
