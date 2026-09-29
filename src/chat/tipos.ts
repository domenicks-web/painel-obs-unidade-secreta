export type Plataforma = 'yt' | 'tw' | 'tt';

export interface MsgChat {
  id: string;
  plataforma: Plataforma;
  autor: string;
  txt: string;
  tipo: 'msg' | 'super' | 'membro';
  /** valor do superchat como veio da plataforma ("R$ 10,00", "3 roses") */
  valor?: string;
  mod: boolean;
  membro: boolean;
}

export const PLATAFORMAS: Record<Plataforma, { tag: string; cor: string }> = {
  yt: { tag: 'YT', cor: '#FF6B1F' },
  tw: { tag: 'TW', cor: '#8B6CF0' },
  tt: { tag: 'TT', cor: '#FFF3E0' },
};

export function ehPlataforma(p: unknown): p is Plataforma {
  return p === 'yt' || p === 'tw' || p === 'tt';
}

// Cor da etiqueta do nome: fixa por autor, como na referência (tamanho do nome).
const CORES_OVERLAY = ['#FF6B1F', '#8B6CF0', '#FFF3E0'];
const CORES_PAINEL = ['#FF6B1F', '#8B6CF0', '#FFF3E0', '#f0a36b'];
export const corNoOverlay = (autor: string) => CORES_OVERLAY[autor.length % CORES_OVERLAY.length];
export const corNoPainel = (autor: string) => CORES_PAINEL[autor.length % CORES_PAINEL.length];
