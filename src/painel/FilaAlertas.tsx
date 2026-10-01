import { useState } from 'react';
import type { ComandoAlerta, usePlaylistAlertas } from '../alerta/remoto';
import type { Alerta } from '../alerta/useFilaAlertas';

const ROTULO: Record<Alerta['tipo'], { texto: string; classe: string }> = {
  superchat: { texto: 'SUPERCHAT', classe: 'p-pix__tipo--sc' },
  sticker: { texto: 'STICKER', classe: 'p-pix__tipo--sc' },
  membro: { texto: 'MEMBRO', classe: 'p-pix__tipo--membro' },
};

function Linha({ a, children }: { a: Alerta; children?: React.ReactNode }) {
  const r = ROTULO[a.tipo];
  return (
    <div className="p-pix__item p-alertas__item">
      <div className="p-pix__info">
        <div className="p-pix__linha">
          <div className="p-pix__nome">{a.nome}</div>
          <div className={`p-pix__tipo ${r.classe}`}>{r.texto}</div>
        </div>
        {a.msg && <div className="p-pix__msg">{a.msg}</div>}
      </div>
      <div className="p-pix__valor">{a.valor ?? ''}</div>
      <div className="p-alertas__botoes">{children}</div>
    </div>
  );
}

// Playlist dos alertas do YouTube (/alerta no OBS): toca sozinho na ordem; aqui dá pra escolher o
// próximo, tocar de novo, tirar da fila, pular e pausar. Os PIX seguem no widget do LivePix.
export function FilaAlertas({ playlist }: { playlist: ReturnType<typeof usePlaylistAlertas> }) {
  const { estado, online, comando } = playlist;
  const [erro, setErro] = useState<string | null>(null);
  const enviar = async (c: ComandoAlerta, alvo?: string) => setErro(await comando(c, alvo));
  const pausado = !!estado?.pausado;
  const atual = online ? estado?.atual ?? null : null;
  const fila = online ? estado?.fila ?? [] : [];
  const historico = online ? (estado?.historico ?? []).filter((h) => h.id !== atual?.id) : [];

  return (
    <section className="p-alertas" aria-label="Fila de alertas do YouTube">
      <div className="p-bloco-cabeca">
        <div className="p-bloco-titulo">ALERTAS YT</div>
        <div className={!online ? 'p-alertas__status p-alertas__status--fora' : pausado ? 'p-alertas__status p-alertas__status--pausada' : 'p-alertas__status'}>
          {!online ? 'FONTE FORA DO AR' : pausado ? 'FILA PAUSADA' : 'AO VIVO'}
        </div>
      </div>
      {!online && <div className="p-pix__vazio">Abra a fonte /alerta no OBS (com a sessão do chat) pra ver e controlar a fila.</div>}

      <div className="p-alertas__controles">
        <button type="button" className="p-botao-contorno" disabled={!online} onClick={() => enviar(pausado ? 'retomar' : 'pausar')}>
          {pausado ? 'RETOMAR FILA' : 'PAUSAR FILA'}
        </button>
        <button type="button" className="p-botao-contorno" disabled={!online || !atual} onClick={() => enviar('pular')}>
          PULAR
        </button>
      </div>
      {erro && <div className="p-erro">{erro}</div>}

      <div className="p-alertas__lista">
        <div className="p-alertas__secao">
          <div className="p-rotulo">TOCANDO</div>
          {atual ? <Linha a={atual} /> : <div className="p-pix__vazio">{online ? 'Nada tocando.' : '—'}</div>}
        </div>
        <div className="p-alertas__secao">
          <div className="p-rotulo">NA FILA · {fila.length}</div>
          {fila.map((a) => (
            <Linha key={a.id} a={a}>
              <button type="button" className="p-pix__alternar" aria-label={`Tocar ${a.nome} agora`} title="Tocar agora (entra como próximo)" onClick={() => enviar('tocar', a.id)}>
                ▶
              </button>
              <button type="button" className="p-pix__alternar" aria-label={`Tirar ${a.nome} da fila`} title="Tirar da fila" onClick={() => enviar('remover', a.id)}>
                ×
              </button>
            </Linha>
          ))}
        </div>
        {historico.length > 0 && (
          <div className="p-alertas__secao">
            <div className="p-rotulo">JÁ TOCOU</div>
            {historico.map((a) => (
              <Linha key={a.id} a={a}>
                <button type="button" className="p-pix__alternar" aria-label={`Tocar ${a.nome} de novo`} title="Tocar de novo" onClick={() => enviar('tocar', a.id)}>
                  ↻
                </button>
              </Linha>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
