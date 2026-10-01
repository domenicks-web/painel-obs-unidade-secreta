create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'FALHOU: %', msg; end if; end $$;
create function pg_temp.e() returns jsonb language sql as $$
  select estado from public.salas where slug = 'principal' $$;
create function pg_temp.v() returns bigint language sql as $$
  select versao from public.salas where slug = 'principal' $$;
create function pg_temp.falha(sql text) returns boolean language plpgsql as $$
begin execute sql; return false; exception when others then return true; end $$;

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

-- versão: sobe a cada mudança da sala, inclusive recálculo da meta
create temp table v0 as select pg_temp.v() as v;
select public.atualizar_estado('principal', '{"titulo": "V"}');
select pg_temp.ok(pg_temp.v() = (select v from v0) + 1, 'atualizar_estado sobe a versão');
select public.controlar_relogio('principal', 'zerar');
select pg_temp.ok(pg_temp.v() = (select v from v0) + 2, 'relógio sobe a versão');
select public.adicionar_pix_manual('Vê', 1);
select pg_temp.ok(pg_temp.v() > (select v from v0) + 2, 'recálculo sobe a versão');
select pg_temp.ok(((select public.atualizar_estado('principal', '{}'))).versao = pg_temp.v(), 'resposta da RPC traz a versão');
update public.salas set versao = 1 where slug = 'principal';
select pg_temp.ok(pg_temp.v() > (select v from v0), 'versão não volta nem à mão');

-- relógio parado: ajustar soma/subtrai, não passa de zero, e definir crava o tempo
select public.controlar_relogio('principal', 'zerar');
select public.controlar_relogio('principal', 'ajustar', 60);
select pg_temp.ok((pg_temp.e()->>'clockAcumulado')::numeric = 60, '+1 min parado');
select public.controlar_relogio('principal', 'ajustar', -10);
select pg_temp.ok((pg_temp.e()->>'clockAcumulado')::numeric = 50, '−10 s parado');
select public.controlar_relogio('principal', 'ajustar', -600);
select pg_temp.ok((pg_temp.e()->>'clockAcumulado')::numeric = 0, 'não fica negativo');
select public.controlar_relogio('principal', 'definir', 2232);
select pg_temp.ok((pg_temp.e()->>'clockAcumulado')::numeric = 2232, 'definir 37:12');
select pg_temp.ok(not (pg_temp.e()->>'clockRodando')::boolean and pg_temp.e()->'clockInicio' = 'null'::jsonb, 'definir não liga o relógio');

-- relógio rodando: o trecho corrido entra no acumulado e o trecho recomeça agora
select public.controlar_relogio('principal', 'iniciar');
update public.salas set estado = estado || jsonb_build_object('clockInicio', public.agora_ms() - 5000) where slug = 'principal';
select public.controlar_relogio('principal', 'ajustar', 10);
select pg_temp.ok((pg_temp.e()->>'clockAcumulado')::numeric between 2247 and 2248, 'rodando: 2232 + 5 corridos + 10');
select pg_temp.ok(abs((pg_temp.e()->>'clockInicio')::bigint - public.agora_ms()) < 1000, 'trecho recomeça agora');
select pg_temp.ok((pg_temp.e()->>'clockRodando')::boolean, 'continua rodando');
select public.controlar_relogio('principal', 'definir', 100);
select pg_temp.ok((pg_temp.e()->>'clockAcumulado')::numeric = 100 and (pg_temp.e()->>'clockRodando')::boolean, 'definir rodando');
select public.controlar_relogio('principal', 'zerar');

-- entradas ruins
select pg_temp.ok(pg_temp.falha($$select public.controlar_relogio('principal', 'ajustar')$$), 'ajustar sem segundos');
select pg_temp.ok(pg_temp.falha($$select public.controlar_relogio('principal', 'definir', -1)$$), 'definir negativo');
select pg_temp.ok(pg_temp.falha($$select public.controlar_relogio('principal', 'definir', 360000)$$), 'definir acima de 99:59');
select pg_temp.ok(pg_temp.falha($$select public.controlar_relogio('principal', 'voar')$$), 'ação inválida');

-- gol: soma no banco, não fica negativo
select public.atualizar_estado('principal', '{"golsA": 0, "golsB": 0}');
select public.somar_gol('principal', 'A', 1);
select public.somar_gol('principal', 'A', 1);
select public.somar_gol('principal', 'B', 1);
select pg_temp.ok((pg_temp.e()->>'golsA')::int = 2 and (pg_temp.e()->>'golsB')::int = 1, 'gols somados');
select public.somar_gol('principal', 'B', -1);
select public.somar_gol('principal', 'B', -1);
select pg_temp.ok((pg_temp.e()->>'golsB')::int = 0, 'gol não fica negativo');
select pg_temp.ok(pg_temp.falha($$select public.somar_gol('principal', 'C', 1)$$), 'lado inválido');
select pg_temp.ok(pg_temp.falha($$select public.somar_gol('principal', 'A', 5)$$), 'só ±1 por clique');
select pg_temp.ok((select updated_by_nome from public.salas where slug = 'principal') = 'Ana', 'gol conta como edição');

-- sem login não mexe
select set_config('request.jwt.claim.sub', '', false);
select pg_temp.ok(pg_temp.falha($$select public.somar_gol('principal', 'A', 1)$$), 'gol sem login');
select pg_temp.ok(pg_temp.falha($$select public.controlar_relogio('principal', 'ajustar', 10)$$), 'ajuste sem login');
select pg_temp.ok(not has_function_privilege('anon', 'public.somar_gol(text, text, integer)', 'execute'), 'anon sem somar_gol');
select pg_temp.ok(has_function_privilege('authenticated', 'public.controlar_relogio(text, text, numeric)', 'execute'), 'authenticated com relógio');
select pg_temp.ok(not has_function_privilege('anon', 'public.controlar_relogio(text, text, numeric)', 'execute'), 'anon sem relógio');

