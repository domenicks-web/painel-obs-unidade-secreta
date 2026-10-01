-- 0009: visitante (anon) não executa função de escrita nem as internas.
-- No Postgres toda função nasce com EXECUTE para PUBLIC, e o anon herda isso: o "revoke from anon"
-- da 0005 não bastava. As funções já recusavam por dentro (nome_membro_atual() nulo); agora nem
-- chegam a rodar. Quem está logado (authenticated) continua igual; hora_servidor e papel_atual
-- seguem públicas (as telas do OBS e o RLS usam).

revoke execute on function public.atualizar_estado(text, jsonb) from public, anon;
grant execute on function public.atualizar_estado(text, jsonb) to authenticated;
revoke execute on function public.reiniciar_contagem(text) from public, anon;
grant execute on function public.reiniciar_contagem(text) to authenticated;

-- internas: só rodam de dentro das outras funções (security definer) ou como trigger
revoke execute on function public.nome_membro_atual() from public, anon, authenticated;
revoke execute on function public.vincular_membro_ao_logar() from public, anon, authenticated;
revoke execute on function public.vincular_conta_existente_ao_convidar() from public, anon, authenticated;
