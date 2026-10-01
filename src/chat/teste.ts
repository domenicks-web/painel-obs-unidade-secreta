// Mensagens fictícias do modo teste (as mesmas listas da referência Chat US).
import type { MsgChat, Plataforma } from './tipos';

const NOMES = ['zeca_do_grau', 'Lipe10', 'marinaFC', 'tio.baiano', 'ggNoobBR', 'kakaSemFreio', 'Dudinha', 'pedrão_97', 'RafaTático', 'o_juiz_ladrão', 'Bia.gamer', 'cabeçadecuia', 'Nando_Rei', 'LuizaSP', 'teteu', 'Gordinho_FF'];
const MSGS = ['boa noite rapaziada', 'ESSE JUIZ TA VENDIDO', 'kkkkkkkkkk morri', 'manda salve pro pessoal de BH', 'quando sai o próximo react?', 'que resenha boa', 'GOLAÇO', 'calma que ainda tem segundo tempo', 'primeira vez aqui, já me inscrevi', 'esse filme é muito ruim kkkk', 'alguém mais travou?', 'voltei, perdi o que?', 'a unidade não para', 'quero ver o react do trailer novo', 'o som ta baixo', 'bora 1k inscritos', '3 a 1 fácil', 'mito demais', 'tá lagando aqui', 'essa foi histórica'];
const SUPER = ['R$ 5,00', 'R$ 10,00', 'R$ 20,00', 'R$ 50,00'];
const PLATS: Plataforma[] = ['yt', 'tw', 'tt', 'kk'];

const sortear = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
let n = 0;

export function mensagemTeste(tipo: MsgChat['tipo'] = 'msg'): MsgChat {
  return {
    id: `teste-${++n}`,
    plataforma: sortear(PLATS),
    autor: sortear(NOMES),
    txt: sortear(MSGS),
    tipo,
    valor: tipo === 'super' ? sortear(SUPER) : undefined,
    mod: Math.random() < 0.15,
    membro: tipo === 'membro' || Math.random() < 0.3,
  };
}

/** Uma mensagem do modo automático: quase sempre comum, às vezes superchat ou membro. */
export function mensagemAuto(): MsgChat {
  const r = Math.random();
  return mensagemTeste(r < 0.08 ? 'super' : r < 0.12 ? 'membro' : 'msg');
}
