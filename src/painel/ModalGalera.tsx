import { useEffect } from 'react';
import type { Pessoa } from '../live/tipos';
import { CampoTexto } from './CampoTexto';

const MAX = 20;

interface Props {
  galera: Pessoa[];
  aoSalvar: (g: Pessoa[]) => void;
  aoFechar: () => void;
}

// Cada mudança manda a lista inteira; o painel grava com atraso (salvarDepois).
export function ModalGalera({ galera, aoSalvar, aoFechar }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aoFechar]);

  const mudar = (id: string, campo: 'nome' | 'funcao', v: string) =>
    aoSalvar(galera.map((p) => (p.id === id ? { ...p, [campo]: v } : p)));
  const cheia = galera.length >= MAX;

  return (
    <div className="p-modal-fundo" onClick={aoFechar}>
      <div className="p-modal" role="dialog" aria-modal="true" aria-label="GALERA" onClick={(e) => e.stopPropagation()}>
        <div className="p-modal__listra" />
        <div className="p-modal__cabeca">
          <div className="p-modal__titulo">GALERA</div>
          <div className="p-modal__contador">
            {galera.length}/{MAX}
          </div>
        </div>
        <div className="p-modal__lista">
          {galera.map((p, i) => (
            <div key={p.id} className="p-modal__linha">
              <CampoTexto rotulo={`NOME ${i + 1}`} valor={p.nome} maiusculo aoMudar={(v) => mudar(p.id, 'nome', v)} />
              <CampoTexto rotulo={`FUNÇÃO ${i + 1}`} valor={p.funcao} maiusculo aoMudar={(v) => mudar(p.id, 'funcao', v)} />
              <button type="button" className="p-botao-icone" title="Remover" onClick={() => aoSalvar(galera.filter((x) => x.id !== p.id))}>
                ×
              </button>
            </div>
          ))}
          {galera.length === 0 && <div className="p-vazio">Ninguém cadastrado ainda.</div>}
        </div>
        <div className="p-modal__rodape">
          <button
            type="button"
            className="p-botao"
            disabled={cheia}
            onClick={() => aoSalvar([...galera, { id: crypto.randomUUID(), nome: '', funcao: '' }])}
          >
            {cheia ? 'LIMITE DE 20' : '+ ADICIONAR'}
          </button>
          <button type="button" className="p-botao p-botao--escuro" onClick={aoFechar}>
            FECHAR
          </button>
        </div>
      </div>
    </div>
  );
}
