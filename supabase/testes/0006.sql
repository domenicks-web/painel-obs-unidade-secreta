create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'FALHOU: %', msg; end if; end $$;

insert into auth.users (id, email) values ('66666666-6666-6666-6666-666666666666', 'bia@x.com');
insert into public.membros_equipe (email, nome, papel) values ('bia@x.com', 'Bia', 'editor');

-- começa tocando, sem comando
select pg_temp.ok((select not pausado and ultimo_comando is null from public.livepix_controle), 'estado inicial');
select pg_temp.ok((select count(*) = 1 from public.livepix_controle), 'uma linha só');

-- sem login: recusa
select set_config('request.jwt.claim.sub', '', false);
do $$ begin
  perform public.registrar_comando_livepix('pausar');
  raise exception 'FALHOU: aceitou sem login';
exception when others then
  if sqlerrm like 'FALHOU%' then raise; end if;
end $$;

select set_config('request.jwt.claim.sub', '66666666-6666-6666-6666-666666666666', false);

-- pausar liga, pular/repetir/limpar mantêm, retomar desliga
select public.registrar_comando_livepix('pausar');
select pg_temp.ok((select pausado and ultimo_comando = 'pausar' and por_nome = 'Bia' and em is not null from public.livepix_controle), 'pausar');
select public.registrar_comando_livepix('pular');
select pg_temp.ok((select pausado and ultimo_comando = 'pular' from public.livepix_controle), 'pular mantém pausado');
select public.registrar_comando_livepix('limpar');
select pg_temp.ok((select pausado and ultimo_comando = 'limpar' from public.livepix_controle), 'limpar mantém pausado');
select pg_temp.ok((public.registrar_comando_livepix('retomar')).pausado = false, 'retomar devolve a linha despausada');
select public.registrar_comando_livepix('repetir');
select pg_temp.ok((select not pausado and ultimo_comando = 'repetir' from public.livepix_controle), 'repetir mantém tocando');

-- comando inválido
do $$ begin
  perform public.registrar_comando_livepix('explodir');
  raise exception 'FALHOU: aceitou comando inválido';
exception when others then
  if sqlerrm like 'FALHOU%' then raise; end if;
end $$;

-- não dá pra ter uma segunda linha
do $$ begin
  insert into public.livepix_controle (id) values (2);
  raise exception 'FALHOU: aceitou segunda linha';
exception when others then
  if sqlerrm like 'FALHOU%' then raise; end if;
end $$;

-- volta ao estado inicial pros próximos testes
update public.livepix_controle set pausado = false, ultimo_comando = null, por_nome = null, em = null;
