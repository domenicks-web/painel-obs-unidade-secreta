import { useEffect, useId, useState } from 'react';

interface Props {
  valor: string;
  aoMudar: (v: string) => void;
  maiusculo?: boolean;
  tipo?: 'text' | 'number';
  inputMode?: 'text' | 'decimal' | 'numeric';
  placeholder?: string;
  rotulo?: string;
  className?: string;
  title?: string;
}

// Enquanto tem foco, o campo guarda o que a pessoa digita e ignora o eco do servidor;
// sem foco, espelha o valor vindo de fora.
export function CampoTexto({ valor, aoMudar, maiusculo, tipo = 'text', inputMode, placeholder, rotulo, className, title }: Props) {
  const id = useId();
  const [local, setLocal] = useState(valor);
  const [foco, setFoco] = useState(false);
  useEffect(() => {
    if (!foco) setLocal(valor);
  }, [valor, foco]);

  return (
    <div className="p-campo">
      {rotulo && (
        <label htmlFor={id} className="p-rotulo">
          {rotulo}
        </label>
      )}
      <input
        id={id}
        type={tipo}
        inputMode={inputMode}
        className={className ?? 'p-input'}
        value={local}
        placeholder={placeholder}
        title={title}
        onFocus={() => setFoco(true)}
        onBlur={() => setFoco(false)}
        onChange={(e) => {
          const v = maiusculo ? e.target.value.toUpperCase() : e.target.value;
          setLocal(v);
          aoMudar(v);
        }}
      />
    </div>
  );
}
