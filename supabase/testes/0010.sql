create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'FALHOU: %', msg; end if; end $$;
create function pg_temp.falha(sql text) returns boolean language plpgsql as $$
begin execute sql; return false; exception when others then return true; end $$;

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

-- membro manda comando; fica gravado com o nome
select public.comando_alerta('tocar', 'yt-123');
select public.comando_alerta('pausar');
select pg_temp.ok((select count(*) from public.alerta_comandos) = 2, 'dois comandos');
select pg_temp.ok((select por_nome from public.alerta_comandos where comando = 'tocar') = 'Ana', 'por Ana');
select pg_temp.ok((select alvo from public.alerta_comandos where comando = 'tocar') = 'yt-123', 'alvo');

-- validação
select pg_temp.ok(pg_temp.falha($$select public.comando_alerta('explodir')$$), 'comando inválido');
select pg_temp.ok(pg_temp.falha($$select public.comando_alerta('tocar')$$), 'tocar sem alvo');
select pg_temp.ok(pg_temp.falha($$select public.comando_alerta('remover', repeat('x', 200))$$), 'alvo enorme');

-- limpeza: comando de mais de 1 dia some no próximo comando
update public.alerta_comandos set criado_em = now() - interval '2 days' where comando = 'pausar';
select public.comando_alerta('retomar');
select pg_temp.ok(not exists (select 1 from public.alerta_comandos where comando = 'pausar'), 'velho apagado');

-- sem login não manda; visitante só lê (a fonte do OBS escuta pelo Realtime)
select set_config('request.jwt.claim.sub', '', false);
select pg_temp.ok(pg_temp.falha($$select public.comando_alerta('pular')$$), 'sem login');
select pg_temp.ok(not has_function_privilege('anon', 'public.comando_alerta(text, text)', 'execute'), 'anon sem execute');
select pg_temp.ok(has_function_privilege('authenticated', 'public.comando_alerta(text, text)', 'execute'), 'authenticated executa');
set role anon;
select pg_temp.ok((select count(*) from public.alerta_comandos) >= 1, 'anon lê');
select pg_temp.ok(pg_temp.falha($$insert into public.alerta_comandos (comando) values ('pular')$$), 'anon não insere direto');
reset role;
set role authenticated;
select pg_temp.ok(pg_temp.falha($$insert into public.alerta_comandos (comando) values ('pular')$$), 'membro não insere direto (só pela função)');
reset role;
select pg_temp.ok(exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'alerta_comandos'), 'no Realtime');
