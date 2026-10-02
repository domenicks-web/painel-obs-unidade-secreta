create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'FALHOU: %', msg; end if; end $$;
create function pg_temp.falha(sql text) returns boolean language plpgsql as $$
begin execute sql; return false; exception when others then return true; end $$;

-- seed: 4 times de exemplo com 11 titulares cada, na ordem da referência
select pg_temp.ok((select count(*) from public.times) = 4, '4 times de exemplo');
select pg_temp.ok((select count(*) from public.jogadores j join public.times t on t.id = j.time_id
                   where t.nome = 'BRASIL' and j.titular) = 11, 'brasil 11 titulares');
select pg_temp.ok((select j.nome from public.jogadores j join public.times t on t.id = j.time_id
                   where t.nome = 'BRASIL' and j.ordem = 1) = 'Alisson', 'goleiro primeiro');
select pg_temp.ok((select j.numero from public.jogadores j join public.times t on t.id = j.time_id
                   where t.nome = 'BRASIL' and j.ordem = 11) = 11, 'vini jr. por último');
select pg_temp.ok((select tecnico from public.times where nome = 'ÍNDIA') = 'A DEFINIR', 'índia a definir');
select pg_temp.ok((select j.nome from public.jogadores j join public.times t on t.id = j.time_id
                   where t.nome = 'PALMEIRAS' and j.ordem = 9) = 'F. Torres', 'nome com ponto e espaço');

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

-- cria: titulares vão pra frente na ordem gravada
create temp table t_id as
select public.salvar_time(null, ' SANTOS ', 'SAN', 'Fulano', '#123ABC',
  '[{"numero":20,"nome":"Reserva","titular":false},{"numero":1,"nome":"Goleiro","titular":true},{"numero":9,"nome":"Atacante","titular":true}]') as id;
select pg_temp.ok((select nome from public.times where id = (select id from t_id)) = 'SANTOS', 'cria com trim');
select pg_temp.ok((select string_agg(nome, ',' order by ordem) from public.jogadores where time_id = (select id from t_id))
                  = 'Goleiro,Atacante,Reserva', 'ordem com titulares na frente');

-- atualiza troca o elenco inteiro
select public.salvar_time((select id from t_id), 'SANTOS FC', '', '', null, '[{"numero":10,"nome":"Camisa 10","titular":true}]');
select pg_temp.ok((select count(*) from public.jogadores where time_id = (select id from t_id)) = 1, 'elenco trocado');
select pg_temp.ok((select nome from public.times where id = (select id from t_id)) = 'SANTOS FC', 'nome trocado');

-- validação
select pg_temp.ok(pg_temp.falha($$select public.salvar_time(null, '', '', '', null, '[]')$$), 'nome vazio');
select pg_temp.ok(pg_temp.falha($$select public.salvar_time(null, 'X', '', '', 'vermelho', '[]')$$), 'cor inválida');
select pg_temp.ok(pg_temp.falha($$select public.salvar_time(null, 'X', '', '', null,
  (select jsonb_agg(jsonb_build_object('numero', g, 'nome', 'J' || g, 'titular', true)) from generate_series(1, 12) g))$$), '12 titulares');
select pg_temp.ok(pg_temp.falha($$select public.salvar_time(null, 'X', '', '', null, '[{"numero":1,"nome":"","titular":true}]')$$), 'jogador sem nome');
select pg_temp.ok(pg_temp.falha($$select public.salvar_time(gen_random_uuid(), 'X', '', '', null, '[]')$$), 'time inexistente');
select pg_temp.ok((select count(*) from public.times) = 5, 'falhas não gravaram nada');

-- excluir leva o elenco junto
select public.excluir_time((select id from t_id));
select pg_temp.ok(not exists (select 1 from public.jogadores where time_id = (select id from t_id)), 'cascade');

-- sem login não grava; visitante lê, mas não escreve direto nem executa
select set_config('request.jwt.claim.sub', '', false);
select pg_temp.ok(pg_temp.falha($$select public.salvar_time(null, 'X', '', '', null, '[]')$$), 'sem login');
select pg_temp.ok(not has_function_privilege('anon', 'public.salvar_time(uuid, text, text, text, text, jsonb)', 'execute'), 'anon sem execute');
select pg_temp.ok(not has_function_privilege('anon', 'public.excluir_time(uuid)', 'execute'), 'anon sem excluir');
select pg_temp.ok(has_function_privilege('authenticated', 'public.salvar_time(uuid, text, text, text, text, jsonb)', 'execute'), 'authenticated executa');
set role anon;
select pg_temp.ok((select count(*) from public.jogadores) >= 44, 'anon lê jogadores');
select pg_temp.ok(pg_temp.falha($$insert into public.times (nome) values ('X')$$), 'anon não insere');
select pg_temp.ok(pg_temp.falha($$delete from public.times returning 1$$) or (select count(*) from public.times) = 4, 'anon não apaga');
reset role;
set role authenticated;
select pg_temp.ok(pg_temp.falha($$update public.jogadores set nome = 'X' returning 1$$) or not exists (select 1 from public.jogadores where nome = 'X'), 'membro não edita direto');
reset role;
select pg_temp.ok((select count(*) from public.times) = 4, 'nada apagado');
select pg_temp.ok(exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'jogadores'), 'no Realtime');
