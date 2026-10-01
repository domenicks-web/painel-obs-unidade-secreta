create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'FALHOU: %', msg; end if; end $$;

-- visitante (anon) não executa nenhuma função de escrita, nem herdando do PUBLIC
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.atualizar_estado(text, jsonb)',
    'public.reiniciar_contagem(text)',
    'public.controlar_relogio(text, text, numeric)',
    'public.somar_gol(text, text, integer)',
    'public.adicionar_pix_manual(text, numeric, text)',
    'public.alternar_apoio(uuid)',
    'public.registrar_apoio_youtube(text, text, text, text, numeric, text)',
    'public.registrar_comando_livepix(text)'
  ] loop
    perform pg_temp.ok(not has_function_privilege('anon', f, 'execute'), 'anon executa ' || f);
    perform pg_temp.ok(has_function_privilege('authenticated', f, 'execute'), 'authenticated sem ' || f);
  end loop;
  -- internas: nem visitante nem membro chamam direto
  foreach f in array array[
    'public.nome_membro_atual()',
    'public.vincular_membro_ao_logar()',
    'public.vincular_conta_existente_ao_convidar()',
    'public.recalcular_apoios(text)',
    'public.registrar_pix_livepix(text, text, numeric, text)',
    'public.alerta_livepix(text)'
  ] loop
    perform pg_temp.ok(not has_function_privilege('anon', f, 'execute'), 'anon executa ' || f);
  end loop;
  -- leitura pública continua
  perform pg_temp.ok(has_function_privilege('anon', 'public.hora_servidor()', 'execute'), 'anon perdeu hora_servidor');
  perform pg_temp.ok(has_function_privilege('anon', 'public.papel_atual()', 'execute'), 'anon perdeu papel_atual');
end $$;

-- de verdade, com o papel de quem chama: membro logado grava, visitante é barrado na porta
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
set role authenticated;
select public.atualizar_estado('principal', '{"titulo": "LOGADO"}');
select public.somar_gol('principal', 'A', 1);
select public.controlar_relogio('principal', 'ajustar', 10);
select public.reiniciar_contagem('principal');
reset role;
select pg_temp.ok((select estado->>'titulo' from public.salas where slug = 'principal') = 'LOGADO', 'membro logado grava');

set role anon;
do $$ begin
  perform public.atualizar_estado('principal', '{"titulo": "INVASOR"}');
  raise exception 'FALHOU: anon executou atualizar_estado';
exception when insufficient_privilege then null;
end $$;
reset role;
select pg_temp.ok((select estado->>'titulo' from public.salas where slug = 'principal') = 'LOGADO', 'visitante não grava');
