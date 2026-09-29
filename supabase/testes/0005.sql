create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'FALHOU: %', msg; end if; end $$;
create function pg_temp.e() returns jsonb language sql as $$
  select estado from public.salas where slug = 'principal' $$;

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'ana@x.com');
insert into public.membros_equipe (email, nome, papel) values ('ana@x.com', 'Ana', 'editor');
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

-- estado padrão
select pg_temp.ok(pg_temp.e()->>'titulo' = 'OPERAÇÃO AO VIVO', 'titulo padrão');
select pg_temp.ok((pg_temp.e()->>'metaAtual')::numeric = 0, 'meta zerada');
select pg_temp.ok(pg_temp.e()->>'pixNome' = '—', 'sem último pix');
select pg_temp.ok(pg_temp.e() ? 'chatPin' and pg_temp.e()->'chatPin' = 'null'::jsonb, 'chatPin reservado');
select pg_temp.ok(jsonb_array_length(pg_temp.e()->'nomes') = 6, '6 câmeras');
select pg_temp.ok(to_regclass('public.eventos') is null, 'eventos removida');

-- cálculo básico
select public.adicionar_pix_manual('Tiagão', 25, 'pra pizza');
select public.adicionar_pix_manual('Carol', 10.5);
select pg_temp.ok((pg_temp.e()->>'metaAtual')::numeric = 35.5, 'soma 35.5');
select pg_temp.ok(pg_temp.e()->>'pixNome' = 'Carol', 'último = Carol');
select pg_temp.ok((pg_temp.e()->>'pixValor')::numeric = 10.5, 'valor do último');
select pg_temp.ok(pg_temp.e()->>'topNome' = 'Tiagão', 'top = Tiagão');

-- empate no top: fica quem chegou primeiro
select public.adicionar_pix_manual('Duda', 25);
select pg_temp.ok(pg_temp.e()->>'topNome' = 'Tiagão', 'empate mantém o primeiro');
select pg_temp.ok(pg_temp.e()->>'pixNome' = 'Duda', 'último = Duda');

-- não contar
select public.alternar_pix((select id from public.pix where nome = 'Tiagão'));
select pg_temp.ok((pg_temp.e()->>'metaAtual')::numeric = 35.5, 'sem Tiagão: 10.5 + 25');
select pg_temp.ok(pg_temp.e()->>'topNome' = 'Duda', 'top vira Duda');
select public.alternar_pix((select id from public.pix where nome = 'Duda'));
select pg_temp.ok(pg_temp.e()->>'pixNome' = 'Carol', 'último ativo volta a ser Carol');
select public.alternar_pix((select id from public.pix where nome = 'Duda'));

-- ajuste e editado por
select public.atualizar_estado('principal', '{"ajuste": 5}');
select pg_temp.ok((pg_temp.e()->>'metaAtual')::numeric = 40.5, 'ajuste soma');
select pg_temp.ok((select updated_by_nome from public.salas where slug = 'principal') = 'Ana', 'editado por Ana');

-- recálculo automático não conta como edição
update public.salas set updated_at = '2020-01-01', updated_by_nome = 'Fulano' where slug = 'principal';
select public.adicionar_pix_manual('Bia', 1);
select pg_temp.ok((select updated_by_nome from public.salas where slug = 'principal') = 'Fulano', 'recalculo não troca editadoPor');
select pg_temp.ok((select updated_at from public.salas where slug = 'principal') = '2020-01-01', 'recalculo não troca editadoEm');

-- patch não grava campos calculados nem de relógio
select public.atualizar_estado('principal', '{"metaAtual": 999, "clockRodando": true, "timerInicio": 1, "titulo": "X"}');
select pg_temp.ok((pg_temp.e()->>'metaAtual')::numeric = 41.5, 'metaAtual ignorado');
select pg_temp.ok((pg_temp.e()->>'clockRodando')::boolean = false, 'clockRodando ignorado');
select pg_temp.ok(pg_temp.e()->'timerInicio' = 'null'::jsonb, 'timerInicio ignorado');
select pg_temp.ok(pg_temp.e()->>'titulo' = 'X', 'titulo gravado');

-- galera máx. 20
do $$ begin
  perform public.atualizar_estado('principal', jsonb_build_object('galera',
    (select jsonb_agg(jsonb_build_object('id', g::text, 'nome', 'P' || g, 'funcao', '')) from generate_series(1, 21) g)));
  raise exception 'devia recusar 21';
exception when others then
  if sqlerrm = 'devia recusar 21' then raise; end if;
end $$;

-- minutos reinicia contagem; reiniciar_contagem grava hora do servidor
select public.atualizar_estado('principal', '{"minutos": 10}');
select pg_temp.ok(pg_temp.e()->>'timerInicio' is not null, 'minutos grava timerInicio');
select public.reiniciar_contagem('principal');
select pg_temp.ok(abs((pg_temp.e()->>'timerInicio')::bigint - (extract(epoch from now()) * 1000)::bigint) < 5000, 'timerInicio ~ agora');

-- relógio do jogo
select public.controlar_relogio('principal', 'iniciar');
select pg_temp.ok((pg_temp.e()->>'clockRodando')::boolean, 'rodando');
select pg_sleep(1.2);
select public.controlar_relogio('principal', 'pausar');
select pg_temp.ok((pg_temp.e()->>'clockAcumulado')::numeric >= 1, 'acumulou >= 1s');
select pg_temp.ok(pg_temp.e()->'clockInicio' = 'null'::jsonb and not (pg_temp.e()->>'clockRodando')::boolean, 'pausado');
select public.controlar_relogio('principal', 'iniciar');
select public.controlar_relogio('principal', 'iniciar'); -- segundo iniciar não reinicia o trecho
select public.controlar_relogio('principal', 'zerar');
select pg_temp.ok((pg_temp.e()->>'clockAcumulado')::numeric = 0 and not (pg_temp.e()->>'clockRodando')::boolean, 'zerado');

-- patch por caminho: cada editor mexe só no seu pedaço (câmera, campo da enquete)
select public.atualizar_estado('principal', '{"nomes.1": "ZÉ"}');
select public.atualizar_estado('principal', '{"nomes.3": "BIA"}');
select pg_temp.ok(pg_temp.e()->'nomes'->>1 = 'ZÉ' and pg_temp.e()->'nomes'->>3 = 'BIA' and pg_temp.e()->'nomes'->>0 = 'NOME 01', 'nomes por índice');
select public.atualizar_estado('principal', '{"enquete.casa": 40}');
select public.atualizar_estado('principal', '{"enquete.mostrar": true}');
select pg_temp.ok((pg_temp.e()->'enquete'->>'casa')::int = 40 and (pg_temp.e()->'enquete'->>'mostrar')::boolean, 'enquete por campo');
select public.atualizar_estado('principal', '{"metaAtual.x": 1, "clockRodando.y": true}');
select pg_temp.ok(jsonb_typeof(pg_temp.e()->'metaAtual') = 'number' and pg_temp.e()->>'clockRodando' = 'false', 'caminho não fura campos do banco');
select pg_temp.ok(not (pg_temp.e() ? 'nomes.1'), 'caminho não vira chave solta');

-- validações
do $$ begin perform public.adicionar_pix_manual('X', 0); raise exception 'devia recusar valor 0';
exception when others then if sqlerrm = 'devia recusar valor 0' then raise; end if; end $$;
do $$ begin perform public.controlar_relogio('principal', 'voar'); raise exception 'devia recusar ação';
exception when others then if sqlerrm = 'devia recusar ação' then raise; end if; end $$;

-- quem não é da equipe não escreve
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
do $$ begin perform public.adicionar_pix_manual('Intruso', 5); raise exception 'devia recusar';
exception when others then if sqlerrm = 'devia recusar' then raise; end if; end $$;
do $$ begin perform public.atualizar_estado('principal', '{"titulo":"H"}'); raise exception 'devia recusar';
exception when others then if sqlerrm = 'devia recusar' then raise; end if; end $$;

-- anon lê pix mas não escreve direto
set role anon;
select pg_temp.ok((select count(*) from public.pix) = 4, 'anon lê pix');
do $$ begin insert into public.pix (nome, valor, origem) values ('Z', 1, 'manual'); raise exception 'devia recusar';
exception when others then if sqlerrm = 'devia recusar' then raise; end if; end $$;
reset role;
