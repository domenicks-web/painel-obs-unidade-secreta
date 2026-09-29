-- Parte 4: a tabela pix vira a tabela única de apoios (PIX manual e do LivePix,
-- superchat, super sticker e membro novo do YouTube). Valor sempre em BRL.

alter table public.pix rename to apoios;
alter index public.pix_created_at_idx rename to apoios_created_at_idx;
alter policy "pix_select_publica" on public.apoios rename to "apoios_select_publica";

alter table public.apoios
  add column tipo text not null default 'pix' check (tipo in ('pix', 'superchat', 'sticker', 'membro')),
  -- como veio da plataforma ("US$ 10.00"); vazio no PIX, que já é em real
  add column valor_texto text not null default '' check (char_length(valor_texto) <= 40);

alter table public.apoios drop constraint pix_origem_check;
alter table public.apoios add constraint apoios_origem_check check (origem in ('manual', 'livepix', 'youtube'));
-- membro não tem valor; superchat em moeda que não deu pra converter fica com 0 (aparece com o valor original)
alter table public.apoios drop constraint pix_valor_check;
alter table public.apoios add constraint apoios_valor_check check (valor >= 0 and (tipo <> 'pix' or valor > 0));

-- o trigger e as funções antigas apontavam para "pix"
drop trigger pix_recalcula on public.apoios;
drop function public.pix_mudou();
drop function public.alternar_pix(uuid);

-- Meta = todos os apoios ativos (em BRL) + ajuste. "Último PIX" (card do Host) só olha PIX;
-- "top da live" olha qualquer apoio pago.
create or replace function public.recalcular_apoios(p_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ajuste numeric;
  v_soma numeric;
  v_ult_nome text; v_ult_valor numeric;
  v_top_nome text; v_top_valor numeric;
begin
  -- trava a linha antes de somar: com apoios chegando ao mesmo tempo, a soma é feita
  -- depois que o outro commit terminou e enxerga o apoio dele
  perform 1 from salas where slug = p_slug for update;
  select coalesce((estado->>'ajuste')::numeric, 0) into v_ajuste from salas where slug = p_slug;
  select coalesce(sum(valor), 0) into v_soma from apoios where not off;
  select nome, valor into v_ult_nome, v_ult_valor from apoios
    where not off and tipo = 'pix' order by created_at desc, id desc limit 1;
  select nome, valor into v_top_nome, v_top_valor from apoios
    where not off and valor > 0 order by valor desc, created_at asc, id asc limit 1;

  update salas
  set estado = estado || jsonb_build_object(
    'metaAtual', v_soma + coalesce(v_ajuste, 0),
    'pixNome', coalesce(v_ult_nome, '—'),
    'pixValor', coalesce(v_ult_valor, 0),
    'topNome', coalesce(v_top_nome, '—'),
    'topValor', coalesce(v_top_valor, 0)
  )
  where slug = p_slug;
end;
$$;
revoke execute on function public.recalcular_apoios(text) from public, anon, authenticated;

create or replace function public.apoios_mudaram()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform recalcular_apoios('principal');
  return null;
end;
$$;
revoke execute on function public.apoios_mudaram() from public, anon, authenticated;

create trigger apoios_recalcula
after insert or update or delete on public.apoios
for each statement execute function public.apoios_mudaram();

-- a atualizar_estado (0005) chama recalcular_pix quando o ajuste da meta muda: vira um repasse
create or replace function public.recalcular_pix(p_slug text)
returns void
language sql
security definer
set search_path = public
as $$ select recalcular_apoios(p_slug) $$;
revoke execute on function public.recalcular_pix(text) from public, anon, authenticated;

create or replace function public.adicionar_pix_manual(p_nome text, p_valor numeric, p_msg text default '')
returns public.apoios
language plpgsql
security definer
set search_path = public
as $$
declare
  v_apoio apoios;
begin
  if nome_membro_atual() is null then raise exception 'não autorizado'; end if;
  insert into apoios (nome, valor, msg, origem, tipo)
  values (trim(p_nome), p_valor, coalesce(trim(p_msg), ''), 'manual', 'pix')
  returning * into v_apoio;
  return v_apoio;
end;
$$;
revoke execute on function public.adicionar_pix_manual(text, numeric, text) from public, anon;
grant execute on function public.adicionar_pix_manual(text, numeric, text) to authenticated;

create or replace function public.alternar_apoio(p_id uuid)
returns public.apoios
language plpgsql
security definer
set search_path = public
as $$
declare
  v_apoio apoios;
begin
  if nome_membro_atual() is null then raise exception 'não autorizado'; end if;
  update apoios set off = not off where id = p_id returning * into v_apoio;
  if v_apoio is null then raise exception 'apoio não encontrado'; end if;
  return v_apoio;
end;
$$;
revoke execute on function public.alternar_apoio(uuid) from public, anon;
grant execute on function public.alternar_apoio(uuid) to authenticated;

-- Superchat / super sticker / membro novo do YouTube, gravado pelo painel (quem recebe o chat
-- do Social Stream Ninja). Vários painéis abertos gravam o mesmo apoio: o externo_id deduplica
-- e quem chegar depois recebe null.
create or replace function public.registrar_apoio_youtube(
  p_externo text, p_tipo text, p_nome text, p_msg text, p_valor numeric, p_valor_texto text
)
returns public.apoios
language plpgsql
security definer
set search_path = public
as $$
declare
  v_apoio apoios;
begin
  if nome_membro_atual() is null then raise exception 'não autorizado'; end if;
  if p_tipo not in ('superchat', 'sticker', 'membro') then raise exception 'tipo inválido: %', p_tipo; end if;
  if coalesce(trim(p_externo), '') = '' then raise exception 'externo_id obrigatório'; end if;
  insert into apoios (nome, valor, msg, origem, tipo, externo_id, valor_texto)
  values (
    left(trim(p_nome), 60),
    case when p_tipo = 'membro' then 0 else greatest(round(coalesce(p_valor, 0), 2), 0) end,
    left(coalesce(trim(p_msg), ''), 280),
    'youtube', p_tipo, trim(p_externo), left(coalesce(trim(p_valor_texto), ''), 40)
  )
  on conflict (externo_id) do nothing
  returning * into v_apoio;
  return v_apoio;
end;
$$;
revoke execute on function public.registrar_apoio_youtube(text, text, text, text, numeric, text) from public, anon;
grant execute on function public.registrar_apoio_youtube(text, text, text, text, numeric, text) to authenticated;

-- PIX confirmado pela API do LivePix (webhook). Só o servidor, com a chave service_role.
create or replace function public.registrar_pix_livepix(p_externo text, p_nome text, p_valor numeric, p_msg text)
returns public.apoios
language plpgsql
security definer
set search_path = public
as $$
declare
  v_apoio apoios;
begin
  insert into apoios (nome, valor, msg, origem, tipo, externo_id)
  values (
    left(coalesce(nullif(trim(p_nome), ''), 'ANÔNIMO'), 60), round(p_valor, 2),
    left(coalesce(trim(p_msg), ''), 280), 'livepix', 'pix', trim(p_externo)
  )
  on conflict (externo_id) do nothing
  returning * into v_apoio;
  return v_apoio;
end;
$$;
revoke execute on function public.registrar_pix_livepix(text, text, numeric, text) from public, anon, authenticated;
grant execute on function public.registrar_pix_livepix(text, text, numeric, text) to service_role;

-- /alerta pausa e retoma o LivePix enquanto toca (servidor, service_role).
-- Retomar só vale se a última pausa foi do próprio alerta: se alguém da equipe
-- pausou (antes ou no meio), o alerta não mexe.
create or replace function public.alerta_livepix(p_acao text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v livepix_controle;
begin
  select * into v from livepix_controle where id = 1 for update;
  if p_acao = 'segurar' then
    if v.pausado then return 'ja_pausado'; end if;
    update livepix_controle
    set pausado = true, ultimo_comando = 'pausar', por_nome = 'ALERTA', em = clock_timestamp()
    where id = 1;
    return 'pausar';
  elsif p_acao = 'soltar' then
    if not v.pausado or v.por_nome is distinct from 'ALERTA' then return 'nada'; end if;
    update livepix_controle
    set pausado = false, ultimo_comando = 'retomar', por_nome = 'ALERTA', em = clock_timestamp()
    where id = 1;
    return 'retomar';
  end if;
  raise exception 'ação inválida: %', p_acao;
end;
$$;
revoke execute on function public.alerta_livepix(text) from public, anon, authenticated;
grant execute on function public.alerta_livepix(text) to service_role;

select public.recalcular_apoios('principal');
