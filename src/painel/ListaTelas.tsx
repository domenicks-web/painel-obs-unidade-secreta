import { useEffect } from 'react';
import { TELAS, type TelaId } from '../live/tipos';

export function ListaTelas({ atual, aoEscolher }: { atual: TelaId; aoEscolher: (t: TelaId) => void }) {
  // atalhos 1–9 quando o foco não está num campo
  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      const alvo = e.target as HTMLElement | null;
      if (alvo && ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= TELAS.length) aoEscolher(TELAS[n - 1].id);
    }
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [aoEscolher]);

  return (
    <nav className="p-telas" aria-label="Telas">
      <div className="p-telas__titulo">TELAS</div>
      {TELAS.map((t, i) => (
        <button
          key={t.id}
          type="button"
          className={t.id === atual ? 'p-tela p-tela--ativa' : 'p-tela'}
          aria-pressed={t.id === atual}
          title={`Atalho: ${i + 1}`}
          onClick={() => aoEscolher(t.id)}
        >
          <span>{t.label}</span>
        </button>
      ))}
      <div className="p-telas__espaco" />
      <div className="p-telas__dica">Escolhe a tela pra editar. O que muda aqui aparece no OBS na hora, mesmo se a tela não estiver no ar.</div>
    </nav>
  );
}
