// Controles do alerta do LivePix (pausar, retomar, pular, repetir, limpar fila), rodando no servidor.
// Usa os links de "Controles de Alertas" do painel do LivePix, que ficam só aqui (LIVEPIX_URL_*).
// O painel chama /api/livepix/<comando> com o token do Supabase de quem está logado; só passa
// quem é da equipe. Os links não dizem se o alerta está pausado, então depois que o LivePix
// aceita o comando ele fica registrado no banco (livepix_controle) pra todo mundo ver igual.

export const COMANDOS = ['pausar', 'retomar', 'pular', 'repetir', 'limpar'] as const;
export type Comando = (typeof COMANDOS)[number];

export interface Ambiente {
  LIVEPIX_URL_PAUSAR?: string;
  LIVEPIX_URL_RETOMAR?: string;
  LIVEPIX_URL_PULAR?: string;
  LIVEPIX_URL_REPETIR?: string;
  LIVEPIX_URL_LIMPAR?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}

type Fetch = typeof fetch;

const VARIAVEL: Record<Comando, keyof Ambiente> = {
  pausar: 'LIVEPIX_URL_PAUSAR',
  retomar: 'LIVEPIX_URL_RETOMAR',
  pular: 'LIVEPIX_URL_PULAR',
  repetir: 'LIVEPIX_URL_REPETIR',
  limpar: 'LIVEPIX_URL_LIMPAR',
};

export const ehComando = (x: string): x is Comando => (COMANDOS as readonly string[]).includes(x);

const resposta = (status: number, corpo?: unknown) =>
  corpo === undefined
    ? new Response(null, { status })
    : new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json' } });

// Confere o token do Supabase de quem chamou e se essa pessoa está em membros_equipe.
async function membroDaEquipe(req: Request, amb: Ambiente, f: Fetch): Promise<'ok' | 'sem_login' | 'fora'> {
  const auth = req.headers.get('authorization') ?? '';
  if (!/^Bearer \S+$/.test(auth)) return 'sem_login';
  const cabecalhos = { apikey: amb.SUPABASE_ANON_KEY!, authorization: auth };
  const u = await f(`${amb.SUPABASE_URL}/auth/v1/user`, { headers: cabecalhos });
  if (!u.ok) return 'sem_login';
  const { id } = (await u.json()) as { id?: string };
  if (!id) return 'sem_login';
  const m = await f(`${amb.SUPABASE_URL}/rest/v1/membros_equipe?select=papel&user_id=eq.${encodeURIComponent(id)}`, { headers: cabecalhos });
  if (!m.ok) return 'fora';
  const linhas = (await m.json()) as unknown[];
  return Array.isArray(linhas) && linhas.length > 0 ? 'ok' : 'fora';
}

// Grava o comando no banco como quem clicou. Devolve a linha nova, ou null se não deu.
async function registrar(req: Request, amb: Ambiente, f: Fetch, comando: Comando): Promise<unknown> {
  const r = await f(`${amb.SUPABASE_URL}/rest/v1/rpc/registrar_comando_livepix`, {
    method: 'POST',
    headers: {
      apikey: amb.SUPABASE_ANON_KEY!,
      authorization: req.headers.get('authorization')!,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ p_comando: comando }),
  });
  return r.ok ? r.json() : null;
}

export async function tratarComando(req: Request, comando: string, amb: Ambiente, f: Fetch = fetch): Promise<Response> {
  if (req.method !== 'POST') return resposta(405, { erro: 'método não permitido' });
  if (!ehComando(comando)) return resposta(404, { erro: 'comando desconhecido' });

  const link = amb[VARIAVEL[comando]];
  if (!link) return resposta(500, { erro: `LivePix não configurado: defina ${VARIAVEL[comando]} no servidor` });
  if (!amb.SUPABASE_URL || !amb.SUPABASE_ANON_KEY) return resposta(500, { erro: 'Supabase não configurado no servidor' });

  try {
    const quem = await membroDaEquipe(req, amb, f);
    if (quem === 'sem_login') return resposta(401, { erro: 'faça login' });
    if (quem === 'fora') return resposta(403, { erro: 'só a equipe controla os alertas' });

    // os links aceitam GET e POST (respondem 204); POST porque é uma ação
    const r = await f(link, { method: 'POST' });
    if (!r.ok) return resposta(502, { erro: `LivePix respondeu HTTP ${r.status}` });

    // O LivePix já fez o comando: mesmo se o registro falhar, responde sucesso
    // (repetir o clique pularia ou limparia de novo). O painel se acerta na próxima leitura.
    const linha = await registrar(req, amb, f, comando).catch(() => null);
    if (!linha) console.error(`controles LivePix: "${comando}" feito, mas não registrado no banco`);
    return resposta(200, { estado: linha });
  } catch (e) {
    // mensagem genérica: nada do link (ele é a senha dos controles)
    console.error('controles LivePix:', e instanceof Error ? e.message : e);
    return resposta(502, { erro: 'não deu pra falar com o LivePix' });
  }
}
