import { useEffect, useId, useState } from 'react';
import type { Pessoa } from '../live/tipos';

interface Props {
  numero: number;
  valor: string;
  galera: Pessoa[];
  aoMudar: (v: string) => void;
}

// Nome da câmera: texto livre, com a galera filtrando enquanto digita (↑ ↓ Enter Esc).
export function CampoCamera({ numero, valor, galera, aoMudar }: Props) {
  const id = useId();
  const rotulo = `CÂMERA ${String(numero).padStart(2, '0')}`;
  const [local, setLocal] = useState(valor);
  const [aberto, setAberto] = useState(false);
  const [destaque, setDestaque] = useState(-1);
  useEffect(() => {
    if (!aberto) setLocal(valor);
  }, [valor, aberto]);

  const termo = local.trim().toUpperCase();
  const opcoes = galera.filter((p) => p.nome && (!termo || p.nome.toUpperCase().includes(termo))).slice(0, 8);

  function escolher(nome: string) {
    setLocal(nome);
    aoMudar(nome);
    setAberto(false);
    setDestaque(-1);
  }

  return (
    <div className="p-campo p-camera">
      <label htmlFor={id} className="p-rotulo">
        {rotulo}
      </label>
      <input
        id={id}
        className="p-input"
        role="combobox"
        autoComplete="off"
        aria-expanded={aberto && opcoes.length > 0}
        aria-controls={`${id}-lista`}
        value={local}
        onFocus={() => setAberto(true)}
        onBlur={() => setAberto(false)}
        onChange={(e) => {
          const v = e.target.value.toUpperCase();
          setLocal(v);
          aoMudar(v);
          setAberto(true);
          setDestaque(-1);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setAberto(true);
            setDestaque((d) => Math.min(opcoes.length - 1, d + 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setDestaque((d) => Math.max(0, d - 1));
          } else if (e.key === 'Enter' && destaque >= 0 && opcoes[destaque]) {
            e.preventDefault();
            escolher(opcoes[destaque].nome);
          } else if (e.key === 'Escape') setAberto(false);
        }}
      />
      {aberto && opcoes.length > 0 && (
        <ul id={`${id}-lista`} role="listbox" className="p-camera__lista">
          {opcoes.map((p, i) => (
            <li
              key={p.id}
              role="option"
              aria-selected={i === destaque}
              aria-label={p.nome}
              className={i === destaque ? 'p-camera__opcao p-camera__opcao--ativa' : 'p-camera__opcao'}
              onMouseDown={(e) => {
                e.preventDefault();
                escolher(p.nome);
              }}
            >
              <span>{p.nome}</span>
              <span className="p-camera__funcao">{p.funcao}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
