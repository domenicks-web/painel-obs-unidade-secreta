create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'FALHOU: %', msg; end if; end $$;
create function pg_temp.e() returns jsonb language sql as $$ select estado from public.salas where slug = 'principal' $$;
create function pg_temp.ev() returns jsonb language sql as $$ select estado->'golEvento' from public.salas where slug = 'principal' $$;
create function pg_temp.falha(sql text) returns boolean language plpgsql as $$
begin execute sql; return false; exception when others then return true; end $$;

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
select public.atualizar_estado('principal', '{"golsA": 0, "golsB": 0}');

-- "+" grava o gol e o evento: time, placar novo, hora do servidor, animação pelo padrão (casa liga, fora não)
select public.somar_gol('principal', 'A', 1);
select pg_temp.ok(pg_temp.ev()->>'lado' = 'A' and (pg_temp.ev()->>'a')::int = 1 and (pg_temp.ev()->>'b')::int = 0, 'evento A 1x0');
select pg_temp.ok((pg_temp.ev()->>'anim')::boolean, 'casa: animação ligada por padrão');
select pg_temp.ok(abs((pg_temp.ev()->>'em')::bigint - public.agora_ms()) < 2000, 'hora do servidor');
select pg_temp.ok((pg_temp.ev()->>'dur')::numeric = 4, 'duração padrão 4 s');
create temp table id1 as select pg_temp.ev()->>'id' as id;
select public.somar_gol('principal', 'B', 1);
select pg_temp.ok(not (pg_temp.ev()->>'anim')::boolean, 'fora: desligada por padrão');
select pg_temp.ok(pg_temp.ev()->>'id' <> (select id from id1), 'cada gol tem id novo');
select pg_temp.ok((pg_temp.ev()->>'a')::int = 1 and (pg_temp.ev()->>'b')::int = 1, 'placar 1x1 no evento');

-- chaves do painel valem; duração fica entre 3 e 6
select public.atualizar_estado('principal', '{"golAnimB": true, "golDuracao": 9}');
select public.somar_gol('principal', 'B', 1);
select pg_temp.ok((pg_temp.ev()->>'anim')::boolean, 'fora ligada pelo painel');
select pg_temp.ok((pg_temp.ev()->>'dur')::numeric = 6, 'duração no máximo 6');

-- "–" no mesmo time anula a animação; no outro time não mexe
select public.somar_gol('principal', 'A', -1);
select pg_temp.ok(not coalesce((pg_temp.ev()->>'anulado')::boolean, false), '− do outro time não anula');
select public.somar_gol('principal', 'B', -1);
select pg_temp.ok((pg_temp.ev()->>'anulado')::boolean, '− do mesmo time anula');
select pg_temp.ok((pg_temp.e()->>'golsB')::int = 1, 'placar voltou');

-- "–" com zero não muda nada (nem anula)
select public.atualizar_estado('principal', '{"golsA": 0}');
select public.somar_gol('principal', 'A', 1);
select public.somar_gol('principal', 'A', -1);
select public.somar_gol('principal', 'A', -1);
select pg_temp.ok((pg_temp.e()->>'golsA')::int = 0, 'não fica negativo');

-- repetir: evento novo do último gol, com o placar de agora e a animação ligada
select public.somar_gol('principal', 'B', 1);
create temp table antes as select pg_temp.ev() as ev;
select public.repetir_gol('principal');
select pg_temp.ok(pg_temp.ev()->>'id' <> (select ev->>'id' from antes), 'id novo');
select pg_temp.ok(pg_temp.ev()->>'lado' = 'B' and (pg_temp.ev()->>'anim')::boolean, 'mesmo time, animação ligada');
select pg_temp.ok((pg_temp.ev()->>'b')::int = (pg_temp.e()->>'golsB')::int, 'placar de agora');
select pg_temp.ok(not (pg_temp.ev() ? 'anulado'), 'repetição não vem anulada');

-- sem gol nenhum: repetir explica
update public.salas set estado = estado - 'golEvento' where slug = 'principal';
select pg_temp.ok(pg_temp.falha($$select public.repetir_gol('principal')$$), 'sem gol pra repetir');

-- permissões
select pg_temp.ok(not has_function_privilege('anon', 'public.repetir_gol(text)', 'execute'), 'anon sem repetir');
select pg_temp.ok(has_function_privilege('authenticated', 'public.repetir_gol(text)', 'execute'), 'membro repete');
select pg_temp.ok(not has_function_privilege('anon', 'public.somar_gol(text, text, integer)', 'execute'), 'anon sem somar');
select set_config('request.jwt.claim.sub', '', false);
select pg_temp.ok(pg_temp.falha($$select public.repetir_gol('principal')$$), 'sem login');
