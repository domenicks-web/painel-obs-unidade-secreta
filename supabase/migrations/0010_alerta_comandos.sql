-- 0010: comandos do painel pra playlist do /alerta (alertas do YouTube).
-- Quem toca é a fonte do OBS (/alerta, sem login): ela escuta esta tabela pelo Realtime e
-- obedece. Só membro da equipe grava (pela função); qualquer um lê, porque a fonte do OBS é
-- anônima — o comando só diz "toque o alerta X", não tem nada secreto.

create table public.alerta_comandos (
  id bigint generated always as identity primary key,
  comando text not null check (comando in ('tocar', 'remover', 'pular', 'pausar', 'retomar')),
  alvo text check (alvo is null or length(alvo) <= 120),
  por_nome text,
  criado_em timestamptz not null default now()
);

alter table public.alerta_comandos enable row level security;
create policy "todos leem os comandos do alerta" on public.alerta_comandos for select to anon, authenticated using (true);
alter publication supabase_realtime add table public.alerta_comandos;

create or replace function public.comando_alerta(p_comando text, p_alvo text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text := nome_membro_atual();
begin
  if v_nome is null then raise exception 'não autorizado'; end if;
  if p_comando in ('tocar', 'remover') and coalesce(p_alvo, '') = '' then
    raise exception '% precisa do alerta', p_comando;
  end if;
  -- comando só vale na hora: o que passou de um dia não serve pra nada
  delete from alerta_comandos where criado_em < now() - interval '1 day';
  insert into alerta_comandos (comando, alvo, por_nome) values (p_comando, p_alvo, v_nome);
end;
$$;

revoke execute on function public.comando_alerta(text, text) from public, anon;
grant execute on function public.comando_alerta(text, text) to authenticated;
