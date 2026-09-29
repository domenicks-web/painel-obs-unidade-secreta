-- Parte 4: tabela única de apoios. Roda depois do 0005.sql e 0006.sql (Ana logada, editora).
create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'FALHOU: %', msg; end if; end $$;
create function pg_temp.e() returns jsonb language sql as $$
  select estado from public.salas where slug = 'principal' $$;
create function pg_temp.falha(sql text) returns boolean language plpgsql as $$
begin execute sql; return false; exception when others then return true; end $$;

select pg_temp.ok(to_regclass('public.pix') is null and to_regclass('public.apoios') is not null, 'pix virou apoios');

-- começa do zero
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
delete from public.apoios;
select public.atualizar_estado('principal', '{"ajuste": 0}');
select pg_temp.ok((pg_temp.e()->>'metaAtual')::numeric = 0, 'meta zerada');

-- PIX manual continua igual
select public.adicionar_pix_manual('Carol', 10);
select pg_temp.ok((select tipo from public.apoios where nome = 'Carol') = 'pix', 'manual é pix');

-- superchat convertido entra na meta e no top, mas não no "último PIX"
select public.registrar_apoio_youtube('yt:1:Lipe:US$ 10.00', 'superchat', 'Lipe', 'salve', 54.3, 'US$ 10.00');
select pg_temp.ok((pg_temp.e()->>'metaAtual')::numeric = 64.3, 'meta soma superchat');
select pg_temp.ok(pg_temp.e()->>'topNome' = 'Lipe', 'top considera superchat');
select pg_temp.ok(pg_temp.e()->>'pixNome' = 'Carol', 'último PIX continua Carol');
select pg_temp.ok((select valor_texto from public.apoios where nome = 'Lipe') = 'US$ 10.00', 'guarda o valor original');

-- mesmo apoio de novo (outro painel): não duplica e devolve null
select pg_temp.ok(public.registrar_apoio_youtube('yt:1:Lipe:US$ 10.00', 'superchat', 'Lipe', 'salve', 54.3, 'US$ 10.00') is null, 'repetido devolve null');
select pg_temp.ok((select count(*) from public.apoios where nome = 'Lipe') = 1, 'não duplica');

-- membro: valor 0 mesmo se mandarem outro
select public.registrar_apoio_youtube('yt:2:Bia:', 'membro', 'Bia', '', 99, '');
select pg_temp.ok((select valor from public.apoios where nome = 'Bia') = 0, 'membro vale 0');
select pg_temp.ok((pg_temp.e()->>'metaAtual')::numeric = 64.3, 'membro não mexe na meta');

-- sticker em moeda desconhecida: entra com 0
select public.registrar_apoio_youtube('yt:3:Zé:₿ 1', 'sticker', 'Zé', '', 0, '₿ 1');
select pg_temp.ok((select valor from public.apoios where nome = 'Zé') = 0, 'moeda desconhecida vale 0');

-- não contar
select public.alternar_apoio((select id from public.apoios where nome = 'Lipe'));
select pg_temp.ok((pg_temp.e()->>'metaAtual')::numeric = 10, 'sem Lipe: 10');
select pg_temp.ok(pg_temp.e()->>'topNome' = 'Carol', 'top volta a Carol');
select public.alternar_apoio((select id from public.apoios where nome = 'Lipe'));

-- ajuste da meta ainda recalcula (atualizar_estado → recalcular_pix → recalcular_apoios)
select public.atualizar_estado('principal', '{"ajuste": 5}');
select pg_temp.ok((pg_temp.e()->>'metaAtual')::numeric = 69.3, 'ajuste soma');
select public.atualizar_estado('principal', '{"ajuste": 0}');

-- validações
select pg_temp.ok(pg_temp.falha($$select public.registrar_apoio_youtube('x', 'pix', 'a', '', 1, '')$$), 'tipo pix recusado no youtube');
select pg_temp.ok(pg_temp.falha($$select public.registrar_apoio_youtube('', 'superchat', 'a', '', 1, '')$$), 'externo vazio recusado');
select pg_temp.ok(pg_temp.falha($$insert into public.apoios (nome, valor, origem, tipo) values ('x', 0, 'manual', 'pix')$$), 'pix com valor 0 recusado');

-- sem login: não grava
select set_config('request.jwt.claim.sub', '', false);
select pg_temp.ok(pg_temp.falha($$select public.registrar_apoio_youtube('yt:9', 'superchat', 'a', '', 1, 'R$ 1')$$), 'sem login recusado');
select pg_temp.ok(pg_temp.falha($$select public.alternar_apoio(gen_random_uuid())$$), 'alternar sem login recusado');

-- LivePix (service_role): entra como pix, deduplica
select public.registrar_pix_livepix('livepix:abc', 'Harry', 7.5, 'olá');
select public.registrar_pix_livepix('livepix:abc', 'Harry', 7.5, 'olá');
select pg_temp.ok((select count(*) from public.apoios where externo_id = 'livepix:abc') = 1, 'webhook repetido não duplica');
select pg_temp.ok(pg_temp.e()->>'pixNome' = 'Harry', 'último PIX = Harry');
select public.registrar_pix_livepix('livepix:anon', '  ', 2, null);
select pg_temp.ok((select nome from public.apoios where externo_id = 'livepix:anon') = 'ANÔNIMO', 'sem nome vira ANÔNIMO');

-- permissões: anon e authenticated não chamam as funções do servidor
select pg_temp.ok(not has_function_privilege('authenticated', 'public.registrar_pix_livepix(text, text, numeric, text)', 'execute'), 'webhook só service_role');
select pg_temp.ok(not has_function_privilege('anon', 'public.registrar_pix_livepix(text, text, numeric, text)', 'execute'), 'webhook não é anon');
select pg_temp.ok(has_function_privilege('service_role', 'public.registrar_pix_livepix(text, text, numeric, text)', 'execute'), 'service_role chama webhook');
select pg_temp.ok(not has_function_privilege('authenticated', 'public.alerta_livepix(text)', 'execute'), 'alerta só service_role');
select pg_temp.ok(not has_function_privilege('anon', 'public.registrar_apoio_youtube(text, text, text, text, numeric, text)', 'execute'), 'youtube não é anon');

-- /alerta pausando o LivePix
update public.livepix_controle set pausado = false, por_nome = 'Ana', ultimo_comando = 'retomar' where id = 1;
select pg_temp.ok(public.alerta_livepix('segurar') = 'pausar', 'alerta pausa');
select pg_temp.ok((select pausado and por_nome = 'ALERTA' from public.livepix_controle), 'pausado pelo ALERTA');
select pg_temp.ok(public.alerta_livepix('segurar') = 'ja_pausado', 'segurar de novo não repete');
select pg_temp.ok(public.alerta_livepix('soltar') = 'retomar', 'alerta retoma');
select pg_temp.ok((select not pausado from public.livepix_controle), 'retomado');
-- equipe pausou antes: o alerta não mexe
update public.livepix_controle set pausado = true, por_nome = 'Ana', ultimo_comando = 'pausar' where id = 1;
select pg_temp.ok(public.alerta_livepix('segurar') = 'ja_pausado', 'já pausado pela equipe');
select pg_temp.ok(public.alerta_livepix('soltar') = 'nada', 'não retoma pausa da equipe');
select pg_temp.ok((select pausado and por_nome = 'Ana' from public.livepix_controle), 'continua pausado pela Ana');
select pg_temp.ok(pg_temp.falha($$select public.alerta_livepix('explodir')$$), 'ação inválida');

-- volta ao normal para os próximos testes
delete from public.apoios;
update public.livepix_controle set pausado = false, por_nome = null, ultimo_comando = null, em = null where id = 1;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
