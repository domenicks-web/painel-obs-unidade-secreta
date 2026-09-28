-- 1) As policies de membros_equipe consultavam a própria tabela e o Postgres
--    abortava com "infinite recursion detected in policy". A consulta do papel
--    passa para uma função SECURITY DEFINER, que não passa pelo RLS.
create or replace function public.papel_atual()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select papel from public.membros_equipe where user_id = auth.uid();
$$;

revoke execute on function public.papel_atual() from public;
grant execute on function public.papel_atual() to anon, authenticated;

drop policy if exists "membros_select_propria_equipe" on public.membros_equipe;
drop policy if exists "membros_insert_admin" on public.membros_equipe;
drop policy if exists "membros_update_admin" on public.membros_equipe;
drop policy if exists "membros_delete_admin" on public.membros_equipe;

create policy "membros_select_propria_equipe" on public.membros_equipe
  for select using (user_id = auth.uid() or public.papel_atual() is not null);

create policy "membros_insert_admin" on public.membros_equipe
  for insert with check (public.papel_atual() = 'admin');

create policy "membros_update_admin" on public.membros_equipe
  for update using (public.papel_atual() = 'admin');

create policy "membros_delete_admin" on public.membros_equipe
  for delete using (public.papel_atual() = 'admin');

-- 2) Quem fazia login antes de ser convidado nunca era vinculado: o trigger
--    só rodava no insert de auth.users. Agora o convite também procura a conta
--    já existente pelo e-mail. E-mails são comparados sem diferenciar maiúsculas.
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
  where lower(email) = lower(new.email) and user_id is null;
  return new;
end;
$$;

create or replace function public.vincular_conta_existente_ao_convidar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.email := lower(trim(new.email));
  if new.user_id is null then
    select id into new.user_id from auth.users where lower(email) = new.email limit 1;
    if new.user_id is not null then
      new.nome := coalesce(new.nome, initcap(split_part(new.email, '@', 1)));
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists vincular_conta_existente_ao_convidar_trigger on public.membros_equipe;
create trigger vincular_conta_existente_ao_convidar_trigger
  before insert or update of email on public.membros_equipe
  for each row execute function public.vincular_conta_existente_ao_convidar();

-- recupera quem já ficou preso antes desta migration
update public.membros_equipe m
set user_id = u.id,
    nome = coalesce(m.nome, initcap(split_part(u.email, '@', 1)))
from auth.users u
where m.user_id is null and lower(u.email) = lower(m.email);

-- 3) Membro vinculado com nome nulo era tratado como "não autorizado".
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
  if not exists (select 1 from public.membros_equipe where user_id = auth.uid()) then
    raise exception 'não autorizado';
  end if;
  select coalesce(nome, 'EQUIPE') into v_nome from public.membros_equipe where user_id = auth.uid();

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
