import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { MsgChat } from '../chat/tipos';
import { emReais, TAXAS_FIXAS } from './valor';

export type TipoApoioYouTube = 'superchat' | 'sticker' | 'membro';

/**
 * Mensagem do chat que vale apoio (e alerta): superchat, super sticker ou membro novo do YouTube.
 * Twitch e TikTok ficam só no chat. `externo` é igual em todos os painéis (deduplica no banco).
 */
export function apoioDoYouTube(m: MsgChat): { tipo: TipoApoioYouTube; externo: string } | null {
  if (m.plataforma !== 'yt') return null;
  let tipo: TipoApoioYouTube;
  if (m.tipo === 'super') tipo = m.sticker ? 'sticker' : 'superchat';
  else if (m.tipo === 'membro' && m.membroNovo) tipo = 'membro';
  else return null;
  const chave = m.idOriginal ?? `-:${m.txt.slice(0, 40)}`;
  return { tipo, externo: `yt:${chave}:${m.autor}:${m.valor ?? ''}`.slice(0, 200) };
}

// Cotações: uma busca por página aberta; se falhar, tabela fixa (a meta não pode travar).
let taxas: Promise<Record<string, number>> | null = null;

export function cotacoes(): Promise<Record<string, number>> {
  taxas ??= fetch('/api/cambio')
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then((j: { taxas?: Record<string, number> }) => j.taxas ?? TAXAS_FIXAS)
    .catch(() => TAXAS_FIXAS);
  return taxas;
}

export function esquecerCotacoes() {
  taxas = null;
}

/**
 * Painel: grava no banco os apoios do YouTube que chegam pelo chat (quem recebe o chat do
 * Social Stream Ninja é o navegador). Só mensagens que chegaram com o painel aberto; cada uma
 * uma vez por painel, e o banco ignora a repetida de outro painel.
 */
export function useGravarApoiosYouTube(msgs: MsgChat[], ativo: boolean) {
  const vistos = useRef(new Set<string>());

  useEffect(() => {
    if (!ativo) return;
    for (const m of msgs) {
      if (vistos.current.has(m.id)) continue;
      vistos.current.add(m.id);
      const apoio = apoioDoYouTube(m);
      if (!apoio) continue;
      void cotacoes().then((t) =>
        supabase
          .rpc('registrar_apoio_youtube', {
            p_externo: apoio.externo,
            p_tipo: apoio.tipo,
            p_nome: m.autor,
            p_msg: apoio.tipo === 'superchat' ? m.txt : '',
            p_valor: apoio.tipo === 'membro' ? 0 : emReais(m.valor ?? '', t),
            p_valor_texto: m.valor ?? '',
          })
          .then(({ error }: { error: { message: string } | null }) => {
            if (error) console.error('apoio do YouTube não gravado:', error.message);
          }),
      );
    }
  }, [msgs, ativo]);
}
