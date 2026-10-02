-- 0012: cadastro de times pra tela ESCALAÇÃO.
-- As telas do OBS leem sem login; só quem é da equipe grava, e sempre pelas funções abaixo
-- (time + elenco inteiro numa transação só: a tela nunca vê o elenco pela metade).

create table public.times (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 1 and 40),
  sigla text not null default '' check (char_length(sigla) <= 5),
  tecnico text not null default '' check (char_length(tecnico) <= 40),
  cor text check (cor is null or cor ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now()
);

create table public.jogadores (
  id uuid primary key default gen_random_uuid(),
  time_id uuid not null references public.times(id) on delete cascade,
  numero int not null check (numero between 0 and 999),
  nome text not null check (char_length(nome) between 1 and 30),
  titular boolean not null default false,
  -- titulares: 1 = goleiro, 2–11 na ordem da formação (defesa da direita pra esquerda, meio, ataque)
  ordem int not null check (ordem >= 1)
);
create index jogadores_time_idx on public.jogadores (time_id, ordem);

alter table public.times enable row level security;
alter table public.jogadores enable row level security;
create policy "times_select_publica" on public.times for select using (true);
create policy "jogadores_select_publica" on public.jogadores for select using (true);
-- sem policy de escrita: tudo passa por salvar_time / excluir_time

alter publication supabase_realtime add table public.times;
alter publication supabase_realtime add table public.jogadores;

-- Cria (p_id nulo) ou atualiza o time e troca o elenco inteiro. p_jogadores: lista de
-- {numero, nome, titular} na ordem de exibição; a ordem gravada põe os titulares na frente.
create or replace function public.salvar_time(
  p_id uuid, p_nome text, p_sigla text, p_tecnico text, p_cor text, p_jogadores jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := p_id;
begin
  if nome_membro_atual() is null then raise exception 'não autorizado'; end if;
  if jsonb_typeof(coalesce(p_jogadores, '[]'::jsonb)) <> 'array' then raise exception 'elenco inválido'; end if;
  if jsonb_array_length(coalesce(p_jogadores, '[]'::jsonb)) > 40 then raise exception 'elenco tem no máximo 40 jogadores'; end if;
  if (select count(*) from jsonb_array_elements(coalesce(p_jogadores, '[]'::jsonb)) j
      where coalesce((j->>'titular')::boolean, false)) > 11 then
    raise exception 'no máximo 11 titulares';
  end if;

  if v_id is null then
    insert into times (nome, sigla, tecnico, cor)
    values (trim(p_nome), coalesce(trim(p_sigla), ''), coalesce(trim(p_tecnico), ''), nullif(p_cor, ''))
    returning id into v_id;
  else
    update times
    set nome = trim(p_nome), sigla = coalesce(trim(p_sigla), ''), tecnico = coalesce(trim(p_tecnico), ''), cor = nullif(p_cor, '')
    where id = v_id;
    if not found then raise exception 'time não encontrado'; end if;
    delete from jogadores where time_id = v_id;
  end if;

  insert into jogadores (time_id, numero, nome, titular, ordem)
  select v_id, (j->>'numero')::int, trim(j->>'nome'), coalesce((j->>'titular')::boolean, false),
         row_number() over (order by coalesce((j->>'titular')::boolean, false) desc, pos)
  from jsonb_array_elements(coalesce(p_jogadores, '[]'::jsonb)) with ordinality as e(j, pos);

  return v_id;
end;
$$;

create or replace function public.excluir_time(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if nome_membro_atual() is null then raise exception 'não autorizado'; end if;
  delete from times where id = p_id;
end;
$$;

revoke execute on function public.salvar_time(uuid, text, text, text, text, jsonb) from public, anon;
grant execute on function public.salvar_time(uuid, text, text, text, text, jsonb) to authenticated;
revoke execute on function public.excluir_time(uuid) from public, anon;
grant execute on function public.excluir_time(uuid) to authenticated;

-- Elencos de EXEMPLO (os da referência) e a ÍNDIA com jogadores genéricos: é só editar no painel.
do $$
declare
  v_time record;
  v_id uuid;
begin
  for v_time in
    select * from (values
      ('BRASIL', 'BRA', 'Carlo Ancelotti', '1 Alisson,2 Vanderson,4 Marquinhos,3 Gabriel,6 Alex Sandro,5 Casemiro,8 Bruno G.,20 Paquetá,7 Raphinha,10 Rodrygo,11 Vini Jr.'),
      ('CORINTHIANS', 'COR', 'Dorival Júnior', '1 Hugo Souza,2 Matheuzinho,13 G. Henrique,5 A. Ramalho,46 Hugo,7 Raniele,70 J. Martínez,19 Carrillo,10 Garro,94 Memphis,9 Yuri Alberto'),
      ('PALMEIRAS', 'PAL', 'Abel Ferreira', '21 Weverton,4 Giay,15 G. Gómez,26 Murilo,22 Piquerez,5 A. Moreno,8 Andreas,23 Veiga,17 F. Torres,9 Vitor Roque,18 Maurício'),
      ('ÍNDIA', 'IND', 'A DEFINIR', '1 JOGADOR 1,2 JOGADOR 2,3 JOGADOR 3,4 JOGADOR 4,5 JOGADOR 5,6 JOGADOR 6,7 JOGADOR 7,8 JOGADOR 8,9 JOGADOR 9,10 JOGADOR 10,11 JOGADOR 11')
    ) as t(nome, sigla, tecnico, elenco)
  loop
    if exists (select 1 from times where nome = v_time.nome) then continue; end if;
    insert into times (nome, sigla, tecnico) values (v_time.nome, v_time.sigla, v_time.tecnico) returning id into v_id;
    insert into jogadores (time_id, numero, nome, titular, ordem)
    select v_id, split_part(trim(item), ' ', 1)::int, substr(trim(item), strpos(trim(item), ' ') + 1), true, pos
    from unnest(string_to_array(v_time.elenco, ',')) with ordinality as u(item, pos);
  end loop;
end;
$$;
