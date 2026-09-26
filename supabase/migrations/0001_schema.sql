create extension if not exists pgcrypto;

create table public.salas (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  nome text not null,
  estado jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  updated_by_nome text
);

create table public.membros_equipe (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  user_id uuid unique references auth.users(id),
  nome text,
  papel text not null check (papel in ('admin', 'editor')),
  created_at timestamptz not null default now()
);

create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  sala_id uuid not null references public.salas(id) on delete cascade,
  tipo text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.salas enable row level security;
alter table public.membros_equipe enable row level security;
alter table public.eventos enable row level security;

-- leitura pública: o OBS (browser source) não loga
create policy "salas_select_publica" on public.salas
  for select using (true);

create policy "eventos_select_publica" on public.eventos
  for select using (true);

-- só quem já está na equipe pode gerenciar a própria equipe, e só admins escrevem
create policy "membros_select_propria_equipe" on public.membros_equipe
  for select using (
    exists (select 1 from public.membros_equipe m where m.user_id = auth.uid())
  );

create policy "membros_insert_admin" on public.membros_equipe
  for insert with check (
    exists (select 1 from public.membros_equipe m where m.user_id = auth.uid() and m.papel = 'admin')
  );

create policy "membros_update_admin" on public.membros_equipe
  for update using (
    exists (select 1 from public.membros_equipe m where m.user_id = auth.uid() and m.papel = 'admin')
  );

create policy "membros_delete_admin" on public.membros_equipe
  for delete using (
    exists (select 1 from public.membros_equipe m where m.user_id = auth.uid() and m.papel = 'admin')
  );

-- nenhuma policy de insert/update direto em "salas" ou "eventos":
-- toda escrita passa pelas funções SECURITY DEFINER da migration 0002.

insert into public.salas (slug, nome, estado) values (
  'principal',
  'Principal',
  '{
    "titulo": "RESENHA AO VIVO", "minutos": 5, "fim": 0, "msg": "VOLTAMOS JÁ", "proximo": "SEXTA, 21H",
    "timeA": "CASA", "timeB": "FORA", "golsA": 0, "golsB": 0, "jogo": "AO VIVO",
    "membros": [
      {"n":"NOME 01","f":"UNIDADE SECRETA"},{"n":"NOME 02","f":"UNIDADE SECRETA"},
      {"n":"NOME 03","f":"UNIDADE SECRETA"},{"n":"NOME 04","f":"UNIDADE SECRETA"},
      {"n":"NOME 05","f":"UNIDADE SECRETA"},{"n":"NOME 06","f":"UNIDADE SECRETA"},
      {"n":"NOME 07","f":"UNIDADE SECRETA"},{"n":"NOME 08","f":"UNIDADE SECRETA"},
      {"n":"NOME 09","f":"UNIDADE SECRETA"},{"n":"NOME 10","f":"UNIDADE SECRETA"}
    ],
    "noAr": [0, 1, 2], "cams": ["NOME 01", "NOME 02", "NOME 03"],
    "lt": -1, "ltAte": 0, "ltSeg": 6
  }'::jsonb
);
