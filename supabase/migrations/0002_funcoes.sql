create or replace function public.hora_servidor()
returns timestamptz
language sql
stable
as $$
  select now();
$$;

create or replace function public.atualizar_estado(p_slug text, p_patch jsonb)
returns public.salas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text;
  v_sala public.salas;
begin
  select nome into v_nome from public.membros_equipe where user_id = auth.uid();
  if v_nome is null then
    raise exception 'não autorizado';
  end if;

  update public.salas
  set estado = estado || p_patch,
      updated_at = now(),
      updated_by = auth.uid(),
      updated_by_nome = v_nome
  where slug = p_slug
  returning * into v_sala;

  if v_sala is null then
    raise exception 'sala não encontrada: %', p_slug;
  end if;

  return v_sala;
end;
$$;

create or replace function public.disparar_evento(p_slug text, p_tipo text, p_payload jsonb)
returns public.eventos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sala_id uuid;
  v_evento public.eventos;
begin
  if not exists (select 1 from public.membros_equipe where user_id = auth.uid()) then
    raise exception 'não autorizado';
  end if;

  select id into v_sala_id from public.salas where slug = p_slug;
  if v_sala_id is null then
    raise exception 'sala não encontrada: %', p_slug;
  end if;

  insert into public.eventos (sala_id, tipo, payload)
  values (v_sala_id, p_tipo, p_payload)
  returning * into v_evento;

  return v_evento;
end;
$$;

create or replace function public.vincular_membro_ao_logar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.membros_equipe
  set user_id = new.id,
      nome = coalesce(nome, initcap(split_part(new.email, '@', 1)))
  where email = new.email and user_id is null;
  return new;
end;
$$;

drop trigger if exists vincular_membro_ao_logar_trigger on auth.users;
create trigger vincular_membro_ao_logar_trigger
  after insert on auth.users
  for each row execute function public.vincular_membro_ao_logar();

grant execute on function public.hora_servidor() to anon, authenticated;
grant execute on function public.atualizar_estado(text, jsonb) to authenticated;
grant execute on function public.disparar_evento(text, text, jsonb) to authenticated;
