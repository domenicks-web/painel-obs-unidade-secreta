-- Controles do alerta do LivePix pelos links de "Controles de Alertas".
-- Os links não dizem se o alerta está pausado: o painel guarda aqui o último comando
-- dado com sucesso, e todo mundo da equipe vê o mesmo.

create table public.livepix_controle (
  id smallint primary key default 1 check (id = 1),
  pausado boolean not null default false,
  ultimo_comando text check (ultimo_comando in ('pausar', 'retomar', 'pular', 'repetir', 'limpar')),
  por_nome text,
  em timestamptz
);
insert into public.livepix_controle (id) values (1);

alter table public.livepix_controle enable row level security;
create policy "livepix_controle_select_equipe" on public.livepix_controle
  for select using (public.papel_atual() is not null);
-- sem policy de escrita: só pela função abaixo

alter publication supabase_realtime add table public.livepix_controle;

-- Chamada pelo servidor (api/livepix/*) com o token de quem clicou, depois que o LivePix aceitou.
create or replace function public.registrar_comando_livepix(p_comando text)
returns public.livepix_controle
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text := nome_membro_atual();
  v_linha livepix_controle;
begin
  if v_nome is null then
    raise exception 'não autorizado';
  end if;
  if p_comando is null or p_comando not in ('pausar', 'retomar', 'pular', 'repetir', 'limpar') then
    raise exception 'comando inválido: %', p_comando;
  end if;

  update livepix_controle
  set pausado = case p_comando when 'pausar' then true when 'retomar' then false else pausado end,
      ultimo_comando = p_comando,
      por_nome = v_nome,
      em = clock_timestamp()
  where id = 1
  returning * into v_linha;
  return v_linha;
end;
$$;
revoke execute on function public.registrar_comando_livepix(text) from public, anon;
grant execute on function public.registrar_comando_livepix(text) to authenticated;
