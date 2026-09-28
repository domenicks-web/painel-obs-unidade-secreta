# Telas novas — Parte 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar telas e painel antigos pelas 9 telas novas + `/alerta` + painel novo, com estado único no Supabase, PIX manual e meta calculada no banco.

**Architecture:** Uma linha `salas.principal.estado` (jsonb) é a fonte de verdade de todas as telas; a tabela `pix` alimenta, por gatilho, os campos calculados (`metaAtual`, último, top). Telas são componentes puros `({ estado, agora })` usados tanto nas URLs `/tela/:id` quanto na prévia do painel. Relógios usam a hora do servidor (RPCs gravam `now()`; o cliente mede o deslocamento).

**Tech Stack:** Vite 8 + React 19 + TypeScript 7 + react-router-dom 7 + @supabase/supabase-js 2 + Vitest 5/jsdom; Postgres 17 em Docker para testes SQL; playwright-core + Chromium do cache (`~/.cache/ms-playwright/chromium-1243`) para prints.

**Spec:** `docs/superpowers/specs/2026-09-28-telas-novas-parte-1-design.md` (ler antes de começar; também `TELAS-NOVAS.md`).

## Global Constraints

- Visual idêntico à referência: cores `#FF6B1F` (laranja), `#1A1417` (tinta), `#FFF3E0` (creme), `#8B6CF0` (violeta); fontes Bungee, Barlow Condensed 500/600/700, JetBrains Mono 400/700 (já no `index.html`).
- Palco das telas fixo 1920×1080; `html`, `body`, `#root` transparentes em `/tela/*` e `/alerta`.
- Animações decorativas/cíclicas só em CSS keyframes ou `element.animate()`; nunca estado React por ciclo. Só o countdown e o relógio do jogo re-renderizam por segundo, e só eles.
- Toda hora gravada no banco vem do servidor (`now()` em RPC). O cliente nunca grava `timerInicio`, `clockInicio`, `clockAcumulado`, `clockRodando`, `metaAtual`, `pixNome`, `pixValor`, `topNome`, `topValor`.
- Sala única: slug `'principal'`. Sem `?sala=`.
- Textos de UI em português, caixa-alta como na referência.
- Commits pequenos por tarefa, mensagem em português no estilo `feat: …` / `fix: …` / `chore: …`, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Não aplicar a migration no Supabase de produção antes da Task 14.

## Review Focus

1. Duas pessoas editando o painel ao mesmo tempo, uma digitando: o texto de quem digita não pode "voltar" com eco do Realtime (Task 3 testa pendentes; Task 10 testa CampoTexto com foco).
2. OBS abre a fonte no meio de uma contagem ou com o relógio rodando: tem que mostrar o mesmo tempo que as outras fontes (Task 2 testa as fórmulas com `timerInicio`/`clockInicio` no passado).
3. Countdown chegando a zero: para em 00:00, não recomeça, não vai negativo (Task 2).
4. PIX marcado "não contar" enquanto está na fila do `/alerta`: sai da fila sem pular o que está na tela (Task 9 testa o reducer).
5. PIX com valor quebrado (25,50) e nomes longos: formatação `25,50` e reticências no Host (Task 2 testa `reais`; Task 6 verifica ellipsis por CSS da referência).

---

## Mapa de arquivos

Criar:
- `supabase/migrations/0005_telas_novas.sql` — estado novo, `pix`, funções, gatilho, remoção de `eventos`.
- `supabase/testes/stub-auth.sql`, `supabase/testes/0005.sql`, `supabase/testes/rodar.sh` — teste SQL em Docker.
- `src/live/tipos.ts` — `EstadoLive`, `ESTADO_PADRAO`, `Pix`, `TELAS`, tipos auxiliares.
- `src/live/relogios.ts` — contas de countdown e relógio do jogo.
- `src/live/formatar.ts` — `reais`, `itensLetreiro`, `partesPixLink`, `rotuloJogo`.
- `src/live/relogioServidor.tsx` — provider do deslocamento servidor−cliente + `useAgora`.
- `src/live/useLive.ts` — carregar/assinar/salvar estado (debounce + pendentes).
- `src/live/usePix.ts` — lista de PIX + ações.
- `src/live/fixture.ts` — `ESTADO_REFERENCIA` (mesmos dados padrão da referência).
- `src/telas/telas.css` — keyframes `us*` e classes compartilhadas.
- `src/telas/Palco.tsx`, `SlotCamera.tsx`, `Letreiro.tsx`, `FaixaTicker.tsx`, `Countdown.tsx`, `RelogioJogo.tsx`.
- `src/telas/TelaInicio.tsx`, `TelaIntervalo.tsx`, `TelaFim.tsx`, `TelaTecnico.tsx`, `TelaHost.tsx`, `TelaMesa.tsx`, `TelaLower.tsx`, `TelaFutebol.tsx`, `TelaFilme.tsx`, `index.ts` (mapa id → componente).
- `src/telas/*.test.tsx` — testes das telas.
- `src/pages/TelaPage.tsx` — rota `/tela/:id`.
- `src/alerta/fila.ts` (+ teste), `src/alerta/CartaoAlerta.tsx`, `src/alerta/alerta.css`, `src/pages/AlertaPage.tsx`.
- `src/painel/` — `painel.css`, `Topo.tsx`, `ListaTelas.tsx`, `Previa.tsx`, `CampoTexto.tsx`, `CampoCamera.tsx`, `CamposTela.tsx`, `ColunaPix.tsx`, `CaixaChat.tsx`, `ModalGalera.tsx` (+ testes).
- `scripts/comparar-telas.mjs`, `scripts/package.json` (playwright-core isolado).
- `docs/prints/` — saídas dos prints.

Modificar:
- `src/App.tsx` — rotas novas, remove antigas.
- `src/pages/PainelPage.tsx` — reescrito.
- `README.md` — URLs novas e montagem no OBS.

Remover (Task 14): `src/components/overlay/*`, `src/components/painel/*`, `src/pages/OverlayPage*`, `src/pages/PreviewPage.tsx`, `src/pages/PainelPage.test.tsx` (substituído), `src/hooks/useSala*`, `src/hooks/useEventos*`, `src/hooks/useServerClock*`, `src/lib/tempo*`, `src/types/estado.ts`, `src/styles/overlays.css`.

---

### Task 1: Banco — migration 0005 + teste SQL em Docker

**Files:**
- Create: `supabase/migrations/0005_telas_novas.sql`
- Create: `supabase/testes/stub-auth.sql`, `supabase/testes/0005.sql`, `supabase/testes/rodar.sh`

**Interfaces:**
- Produces (RPCs, todas `security definer`, exigem membro da equipe exceto `hora_servidor`):
  - `atualizar_estado(p_slug text, p_patch jsonb) returns salas`
  - `reiniciar_contagem(p_slug text) returns salas`
  - `controlar_relogio(p_slug text, p_acao text) returns salas` — `p_acao in ('iniciar','pausar','zerar')`
  - `adicionar_pix_manual(p_nome text, p_valor numeric, p_msg text default '') returns pix`
  - `alternar_pix(p_id uuid) returns pix`
  - tabela `public.pix(id, nome, valor, msg, origem, externo_id, off, created_at)`, leitura pública, Realtime ligado.

- [ ] **Step 1: Stub do auth para rodar as migrations fora do Supabase**

`supabase/testes/stub-auth.sql`:

```sql
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
create publication supabase_realtime;
```

- [ ] **Step 2: Script que sobe o Postgres, aplica tudo e roda os asserts**

`supabase/testes/rodar.sh` (dar `chmod +x`):

```bash
#!/usr/bin/env bash
# Sobe um Postgres 17 descartável, aplica o stub do auth, todas as migrations e os testes.
set -euo pipefail
cd "$(dirname "$0")/../.."
NOME=us-sql-teste
docker rm -f "$NOME" >/dev/null 2>&1 || true
docker run -d --name "$NOME" -e POSTGRES_PASSWORD=teste postgres:17-alpine >/dev/null
trap 'docker rm -f "$NOME" >/dev/null' EXIT
# via TCP só responde depois que o init do container terminou
until docker exec "$NOME" psql -U postgres -h 127.0.0.1 -c 'select 1' >/dev/null 2>&1; do sleep 0.5; done
run() { docker exec -i "$NOME" psql -U postgres -h 127.0.0.1 -v ON_ERROR_STOP=1 -q "$@"; }
run < supabase/testes/stub-auth.sql
for f in supabase/migrations/*.sql; do run < "$f"; done
for f in supabase/testes/0*.sql; do run < "$f"; done
echo "SQL OK"
```

- [ ] **Step 3: Escrever os testes SQL (vão falhar: tabela `pix` não existe)**

`supabase/testes/0005.sql`:

```sql
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
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `supabase/testes/rodar.sh`
Expected: erro em `0005.sql` (ex.: `FALHOU: titulo padrão` ou `function public.adicionar_pix_manual does not exist`).

- [ ] **Step 5: Escrever a migration**

`supabase/migrations/0005_telas_novas.sql`:

```sql
-- Telas novas (parte 1): estado novo, tabela pix com meta calculada no banco,
-- relógios pela hora do servidor. Remove o alerta antigo (eventos).

drop function if exists public.disparar_evento(text, text, jsonb);
drop table if exists public.eventos;

create or replace function public.agora_ms()
returns bigint language sql stable as $$
  select (extract(epoch from now()) * 1000)::bigint;
$$;

update public.salas
set estado = '{
  "titulo": "OPERAÇÃO AO VIVO",
  "ticker": "SE INSCREVE NO CANAL ● ATIVA O SININHO ● MANDA O PIX NA DESCRIÇÃO ● A UNIDADE NÃO PARA",
  "nomes": ["NOME 01","NOME 02","NOME 03","NOME 04","NOME 05","NOME 06"],
  "galera": [],
  "minutos": 5, "timerInicio": null, "msg": "VOLTAMOS JÁ",
  "hostCams": "1", "pixLink": "LIVEPIX.GG/UNIDADESECRETA",
  "metaDesc": "PIZZA PRA RAPAZIADA", "metaTotal": 500, "ajuste": 0,
  "metaAtual": 0, "pixNome": "—", "pixValor": 0, "topNome": "—", "topValor": 0,
  "timeA": "CASA", "timeB": "FORA", "golsA": 0, "golsB": 0,
  "jogo": "1º TEMPO", "jogoOutro": "",
  "clockInicio": null, "clockAcumulado": 0, "clockRodando": false,
  "enquete": {"casa": 0, "empate": 0, "fora": 0, "mostrar": false},
  "filme": "NOME DO FILME", "episodio": "T1 · E3",
  "ltNome": "NOME 01", "funcao": "UNIDADE SECRETA",
  "proximo": "SEXTA, 21H",
  "chatPin": null
}'::jsonb,
  updated_by = null,
  updated_by_nome = null
where slug = 'principal';

create table public.pix (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 1 and 60),
  valor numeric(10,2) not null check (valor > 0),
  msg text not null default '' check (char_length(msg) <= 280),
  origem text not null check (origem in ('manual', 'livepix')),
  externo_id text unique,
  off boolean not null default false,
  created_at timestamptz not null default clock_timestamp()
);
create index pix_created_at_idx on public.pix (created_at desc);

alter table public.pix enable row level security;
create policy "pix_select_publica" on public.pix for select using (true);
-- sem policy de escrita: tudo passa pelas funções abaixo (e, na parte 2, pelo webhook com service role)

alter publication supabase_realtime add table public.pix;

-- Recalcula meta/último/top no estado. Não mexe em updated_by/updated_at:
-- recálculo automático não é edição de ninguém.
create or replace function public.recalcular_pix(p_slug text)
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
  select coalesce((estado->>'ajuste')::numeric, 0) into v_ajuste from salas where slug = p_slug;
  select coalesce(sum(valor), 0) into v_soma from pix where not off;
  select nome, valor into v_ult_nome, v_ult_valor from pix where not off order by created_at desc, id desc limit 1;
  select nome, valor into v_top_nome, v_top_valor from pix where not off order by valor desc, created_at asc, id asc limit 1;

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
revoke execute on function public.recalcular_pix(text) from public, anon, authenticated;

create or replace function public.pix_mudou()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform recalcular_pix('principal');
  return null;
end;
$$;

create trigger pix_recalcula
after insert or update or delete on public.pix
for each statement execute function public.pix_mudou();

-- nome de quem está logado (null se não for da equipe)
create or replace function public.nome_membro_atual()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(nome, email) from membros_equipe where user_id = auth.uid();
$$;

create or replace function public.atualizar_estado(p_slug text, p_patch jsonb)
returns public.salas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text := nome_membro_atual();
  v_patch jsonb;
  v_sala salas;
begin
  if v_nome is null then
    raise exception 'não autorizado';
  end if;

  v_patch := p_patch - array['metaAtual','pixNome','pixValor','topNome','topValor',
                             'timerInicio','clockInicio','clockAcumulado','clockRodando'];

  if jsonb_typeof(v_patch->'galera') = 'array' and jsonb_array_length(v_patch->'galera') > 20 then
    raise exception 'a galera tem no máximo 20 pessoas';
  end if;

  if v_patch ? 'minutos' then
    v_patch := v_patch || jsonb_build_object('timerInicio', agora_ms());
  end if;

  update salas
  set estado = estado || v_patch,
      updated_at = now(),
      updated_by = auth.uid(),
      updated_by_nome = v_nome
  where slug = p_slug
  returning * into v_sala;

  if v_sala is null then
    raise exception 'sala não encontrada: %', p_slug;
  end if;

  if v_patch ? 'ajuste' or v_patch ? 'metaTotal' then
    perform recalcular_pix(p_slug);
    select * into v_sala from salas where slug = p_slug;
  end if;

  return v_sala;
end;
$$;

create or replace function public.reiniciar_contagem(p_slug text)
returns public.salas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text := nome_membro_atual();
  v_sala salas;
begin
  if v_nome is null then raise exception 'não autorizado'; end if;
  update salas
  set estado = estado || jsonb_build_object('timerInicio', agora_ms()),
      updated_at = now(), updated_by = auth.uid(), updated_by_nome = v_nome
  where slug = p_slug
  returning * into v_sala;
  return v_sala;
end;
$$;

create or replace function public.controlar_relogio(p_slug text, p_acao text)
returns public.salas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text := nome_membro_atual();
  v_e jsonb;
  v_rodando boolean;
  v_patch jsonb;
  v_sala salas;
begin
  if v_nome is null then raise exception 'não autorizado'; end if;
  select estado into v_e from salas where slug = p_slug for update;
  v_rodando := coalesce((v_e->>'clockRodando')::boolean, false);

  if p_acao = 'iniciar' then
    if v_rodando then
      v_patch := '{}'::jsonb;
    else
      v_patch := jsonb_build_object('clockInicio', agora_ms(), 'clockRodando', true);
    end if;
  elsif p_acao = 'pausar' then
    if v_rodando then
      v_patch := jsonb_build_object(
        'clockAcumulado', coalesce((v_e->>'clockAcumulado')::numeric, 0)
                          + (agora_ms() - (v_e->>'clockInicio')::bigint) / 1000.0,
        'clockInicio', null,
        'clockRodando', false);
    else
      v_patch := '{}'::jsonb;
    end if;
  elsif p_acao = 'zerar' then
    v_patch := jsonb_build_object('clockAcumulado', 0, 'clockInicio', null, 'clockRodando', false);
  else
    raise exception 'ação inválida: %', p_acao;
  end if;

  update salas
  set estado = estado || v_patch,
      updated_at = now(), updated_by = auth.uid(), updated_by_nome = v_nome
  where slug = p_slug
  returning * into v_sala;
  return v_sala;
end;
$$;

create or replace function public.adicionar_pix_manual(p_nome text, p_valor numeric, p_msg text default '')
returns public.pix
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pix pix;
begin
  if nome_membro_atual() is null then raise exception 'não autorizado'; end if;
  insert into pix (nome, valor, msg, origem)
  values (trim(p_nome), p_valor, coalesce(trim(p_msg), ''), 'manual')
  returning * into v_pix;
  return v_pix;
end;
$$;

create or replace function public.alternar_pix(p_id uuid)
returns public.pix
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pix pix;
begin
  if nome_membro_atual() is null then raise exception 'não autorizado'; end if;
  update pix set off = not off where id = p_id returning * into v_pix;
  if v_pix is null then raise exception 'pix não encontrado'; end if;
  return v_pix;
end;
$$;

revoke execute on function public.atualizar_estado(text, jsonb) from anon;
revoke execute on function public.reiniciar_contagem(text) from anon;
revoke execute on function public.controlar_relogio(text, text) from anon;
revoke execute on function public.adicionar_pix_manual(text, numeric, text) from anon;
revoke execute on function public.alternar_pix(uuid) from anon;
```

Observação: `revoke ... from anon` não basta sozinho porque `public` tem execute por padrão; mas as funções já recusam quem não é membro (`auth.uid()` nulo para anon), então é só defesa extra.

- [ ] **Step 6: Rodar e ver passar**

Run: `supabase/testes/rodar.sh`
Expected: termina com `SQL OK`.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/0005_telas_novas.sql supabase/testes/
git commit -m "feat(banco): estado das telas novas, tabela pix e meta calculada no banco"
```

---

### Task 2: Tipos e contas puras

**Files:**
- Create: `src/live/tipos.ts`, `src/live/relogios.ts`, `src/live/formatar.ts`, `src/live/fixture.ts`
- Test: `src/live/relogios.test.ts`, `src/live/formatar.test.ts`

**Interfaces:**
- Produces:
  - `type TelaId = 'inicio'|'host'|'futebol'|'filme'|'mesa'|'intervalo'|'lower'|'tecnico'|'fim'`
  - `TELAS: readonly { id: TelaId; label: string }[]` na ordem da referência
  - `interface EstadoLive` (todos os campos da spec), `ESTADO_PADRAO: EstadoLive`
  - `type PatchLive = Partial<Omit<EstadoLive, CampoSoDoBanco>>`
  - `interface Pix { id: string; nome: string; valor: number; msg: string; origem: 'manual'|'livepix'; externo_id: string|null; off: boolean; created_at: string }`
  - `segundosRestantes(minutos: number, timerInicio: number|null, agora: number): number`
  - `bolinhasCheias(restante: number, total: number): number` (0–10)
  - `segundosJogo(e: Pick<EstadoLive,'clockInicio'|'clockAcumulado'|'clockRodando'>, agora: number): number`
  - `mmss(seg: number): string`
  - `reais(v: number): string`, `itensLetreiro(ticker: string): string[]`, `partesPixLink(link: string): [string, string]`, `rotuloJogo(e: Pick<EstadoLive,'jogo'|'jogoOutro'>): string`
  - `ESTADO_REFERENCIA: EstadoLive` (fixture com os dados padrão da referência)

- [ ] **Step 1: Testes que falham**

`src/live/relogios.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { bolinhasCheias, mmss, segundosJogo, segundosRestantes } from './relogios';

describe('segundosRestantes', () => {
  it('parado (sem timerInicio) mostra o total', () => {
    expect(segundosRestantes(5, null, 1_000_000)).toBe(300);
  });
  it('conta a partir do timerInicio do servidor', () => {
    expect(segundosRestantes(5, 1_000_000, 1_000_000 + 61_000)).toBe(239);
  });
  it('arredonda pra cima dentro do segundo (mostra 05:00 no primeiro segundo)', () => {
    expect(segundosRestantes(5, 1_000_000, 1_000_400)).toBe(300);
  });
  it('para em zero e não fica negativo nem recomeça', () => {
    expect(segundosRestantes(5, 0, 301_000)).toBe(0);
    expect(segundosRestantes(5, 0, 10_000_000)).toBe(0);
  });
});

describe('bolinhasCheias', () => {
  it('segue a fórmula da referência', () => {
    expect(bolinhasCheias(300, 300)).toBe(0);
    expect(bolinhasCheias(150, 300)).toBe(5);
    expect(bolinhasCheias(0, 300)).toBe(10);
  });
});

describe('segundosJogo', () => {
  it('parado usa só o acumulado', () => {
    expect(segundosJogo({ clockInicio: null, clockAcumulado: 125, clockRodando: false }, 9e12)).toBe(125);
  });
  it('rodando soma o trecho desde o início', () => {
    expect(segundosJogo({ clockInicio: 1_000_000, clockAcumulado: 60, clockRodando: true }, 1_000_000 + 30_500)).toBe(90);
  });
});

describe('mmss', () => {
  it('formata com zero à esquerda', () => {
    expect(mmss(0)).toBe('00:00');
    expect(mmss(305)).toBe('05:05');
    expect(mmss(6000)).toBe('100:00');
  });
});
```

`src/live/formatar.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { itensLetreiro, partesPixLink, reais, rotuloJogo } from './formatar';

describe('reais', () => {
  it('inteiro sem casas, quebrado com vírgula', () => {
    expect(reais(25)).toBe('25');
    expect(reais(25.5)).toBe('25,50');
    expect(reais(0)).toBe('0');
  });
});

describe('itensLetreiro', () => {
  it('separa por ●, • ou | e ignora vazios', () => {
    expect(itensLetreiro('A ● B •C| D ●  ')).toEqual(['A', 'B', 'C', 'D']);
  });
});

describe('partesPixLink', () => {
  it('quebra na primeira barra mantendo a barra no fim da primeira parte', () => {
    expect(partesPixLink('LIVEPIX.GG/UNIDADESECRETA')).toEqual(['LIVEPIX.GG/', 'UNIDADESECRETA']);
    expect(partesPixLink('SEMBARRA')).toEqual(['SEMBARRA', '']);
  });
});

describe('rotuloJogo', () => {
  it('usa o texto livre quando OUTRO', () => {
    expect(rotuloJogo({ jogo: '2º TEMPO', jogoOutro: 'X' })).toBe('2º TEMPO');
    expect(rotuloJogo({ jogo: 'OUTRO', jogoOutro: 'PÊNALTIS' })).toBe('PÊNALTIS');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/live`
Expected: FAIL (módulos não existem).

- [ ] **Step 3: Implementar**

`src/live/tipos.ts`:

```ts
export const TELAS = [
  { id: 'inicio', label: 'INÍCIO' },
  { id: 'host', label: 'HOST' },
  { id: 'futebol', label: 'FUTEBOL' },
  { id: 'filme', label: 'FILME/SÉRIE' },
  { id: 'mesa', label: 'MESA REDONDA' },
  { id: 'intervalo', label: 'INTERVALO' },
  { id: 'lower', label: 'LOWER THIRD' },
  { id: 'tecnico', label: 'TÉCNICO' },
  { id: 'fim', label: 'FIM' },
] as const;

export type TelaId = (typeof TELAS)[number]['id'];

export const JOGO_OPCOES = ['1º TEMPO', 'INTERVALO', '2º TEMPO', 'PRORROGAÇÃO', 'OUTRO'] as const;
export type Jogo = (typeof JOGO_OPCOES)[number];

export interface Pessoa {
  id: string;
  nome: string;
  funcao: string;
}

export interface Enquete {
  casa: number;
  empate: number;
  fora: number;
  mostrar: boolean;
}

export interface ChatPin {
  autor: string;
  txt: string;
  plataforma: string;
}

export interface EstadoLive {
  titulo: string;
  ticker: string;
  nomes: string[];
  galera: Pessoa[];
  minutos: number;
  timerInicio: number | null;
  msg: string;
  hostCams: '1' | '2' | '3';
  pixLink: string;
  metaDesc: string;
  metaTotal: number;
  ajuste: number;
  metaAtual: number;
  pixNome: string;
  pixValor: number;
  topNome: string;
  topValor: number;
  timeA: string;
  timeB: string;
  golsA: number;
  golsB: number;
  jogo: Jogo;
  jogoOutro: string;
  clockInicio: number | null;
  clockAcumulado: number;
  clockRodando: boolean;
  enquete: Enquete;
  filme: string;
  episodio: string;
  ltNome: string;
  funcao: string;
  proximo: string;
  chatPin: ChatPin | null;
}

export type CampoSoDoBanco =
  | 'metaAtual' | 'pixNome' | 'pixValor' | 'topNome' | 'topValor'
  | 'timerInicio' | 'clockInicio' | 'clockAcumulado' | 'clockRodando';

export type PatchLive = Partial<Omit<EstadoLive, CampoSoDoBanco>>;

export const ESTADO_PADRAO: EstadoLive = {
  titulo: 'OPERAÇÃO AO VIVO',
  ticker: 'SE INSCREVE NO CANAL ● ATIVA O SININHO ● MANDA O PIX NA DESCRIÇÃO ● A UNIDADE NÃO PARA',
  nomes: ['NOME 01', 'NOME 02', 'NOME 03', 'NOME 04', 'NOME 05', 'NOME 06'],
  galera: [],
  minutos: 5,
  timerInicio: null,
  msg: 'VOLTAMOS JÁ',
  hostCams: '1',
  pixLink: 'LIVEPIX.GG/UNIDADESECRETA',
  metaDesc: 'PIZZA PRA RAPAZIADA',
  metaTotal: 500,
  ajuste: 0,
  metaAtual: 0,
  pixNome: '—',
  pixValor: 0,
  topNome: '—',
  topValor: 0,
  timeA: 'CASA',
  timeB: 'FORA',
  golsA: 0,
  golsB: 0,
  jogo: '1º TEMPO',
  jogoOutro: '',
  clockInicio: null,
  clockAcumulado: 0,
  clockRodando: false,
  enquete: { casa: 0, empate: 0, fora: 0, mostrar: false },
  filme: 'NOME DO FILME',
  episodio: 'T1 · E3',
  ltNome: 'NOME 01',
  funcao: 'UNIDADE SECRETA',
  proximo: 'SEXTA, 21H',
  chatPin: null,
};

export interface Pix {
  id: string;
  nome: string;
  valor: number;
  msg: string;
  origem: 'manual' | 'livepix';
  externo_id: string | null;
  off: boolean;
  created_at: string;
}

// numeric pode chegar como string no Realtime
export function normalizarPix(linha: Pix): Pix {
  return { ...linha, valor: Number(linha.valor) };
}
```

`src/live/relogios.ts`:

```ts
import type { EstadoLive } from './tipos';

export function segundosRestantes(minutos: number, timerInicio: number | null, agora: number): number {
  const total = Math.max(0, Math.round(minutos * 60));
  if (timerInicio == null) return total;
  return Math.max(0, Math.ceil(total - (agora - timerInicio) / 1000));
}

export function bolinhasCheias(restante: number, total: number): number {
  if (total <= 0) return 10;
  return Math.min(10, Math.max(0, Math.floor((1 - restante / total) * 10)));
}

export function segundosJogo(
  e: Pick<EstadoLive, 'clockInicio' | 'clockAcumulado' | 'clockRodando'>,
  agora: number,
): number {
  const trecho = e.clockRodando && e.clockInicio != null ? (agora - e.clockInicio) / 1000 : 0;
  return Math.floor(Number(e.clockAcumulado || 0) + Math.max(0, trecho));
}

export function mmss(seg: number): string {
  const s = Math.max(0, Math.floor(seg));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
```

`src/live/formatar.ts`:

```ts
import type { EstadoLive } from './tipos';

export function reais(v: number): string {
  const n = Number(v) || 0;
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',');
}

export function itensLetreiro(ticker: string): string[] {
  return ticker.split(/[●•|]/).map((x) => x.trim()).filter(Boolean);
}

export function partesPixLink(link: string): [string, string] {
  const i = link.indexOf('/');
  return i < 0 ? [link, ''] : [link.slice(0, i + 1), link.slice(i + 1)];
}

export function rotuloJogo(e: Pick<EstadoLive, 'jogo' | 'jogoOutro'>): string {
  return e.jogo === 'OUTRO' ? e.jogoOutro : e.jogo;
}
```

`src/live/fixture.ts` (valores `default` do `data-props` de `referencia/Telas Live.dc.html`, linha 295):

```ts
import { ESTADO_PADRAO, type EstadoLive } from './tipos';

// Mesmos dados que a referência usa por padrão, pra comparação visual lado a lado.
export const ESTADO_REFERENCIA: EstadoLive = {
  ...ESTADO_PADRAO,
  golsA: 1,
  golsB: 0,
  clockAcumulado: 67 * 60,
  jogo: '2º TEMPO',
  metaAtual: 320,
  pixNome: 'FULANO',
  pixValor: 10,
  topNome: 'CICRANO',
  topValor: 50,
  enquete: { casa: 54, empate: 18, fora: 28, mostrar: true },
};
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/live`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/live/
git commit -m "feat(telas): tipos do estado novo e contas de relógio e formatação"
```

---

### Task 3: Dados em tempo real — relógio do servidor, `useLive`, `usePix`

**Files:**
- Create: `src/live/relogioServidor.tsx`, `src/live/useLive.ts`, `src/live/usePix.ts`
- Test: `src/live/useLive.test.ts`, `src/live/usePix.test.ts`

**Interfaces:**
- Consumes: `EstadoLive`, `ESTADO_PADRAO`, `PatchLive`, `Pix`, `normalizarPix` (Task 2); RPCs da Task 1; `supabase` de `src/lib/supabase.ts`.
- Produces:
  - `<RelogioServidorProvider fixo?: boolean>` — mede `hora_servidor` a cada 30 s; `fixo` pula a medição (fixture).
  - `useAgora(tickMs = 1000): number` — hora do servidor em ms, re-renderiza só quem chama.
  - `useLive(opcoes?: { fixture?: EstadoLive })` → `{ estado: EstadoLive; status: 'conectando'|'ao_vivo'|'reconectando'; editadoPor: string|null; editadoEm: string|null; salvar(patch: PatchLive): Promise<void>; salvarDepois(patch: PatchLive): void; reiniciarContagem(): Promise<void>; relogio(acao: 'iniciar'|'pausar'|'zerar'): Promise<void> }`
  - `usePix()` → `{ lista: Pix[]; adicionarManual(nome: string, valor: number, msg?: string): Promise<string|null>; alternar(id: string): Promise<void> }` (retorna mensagem de erro ou null)
  - Constante exportada `SLUG = 'principal'` em `useLive.ts`.

- [ ] **Step 1: Testes que falham**

`src/live/useLive.test.ts` (mesmo padrão de mock de `src/hooks/useSala.test.ts`):

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ESTADO_PADRAO } from './tipos';

type Handler = (payload: { new: unknown }) => void;
let handlerUpdate: Handler | null = null;

vi.mock('../lib/supabase', () => {
  const canal = {
    on: vi.fn((_t: string, _f: unknown, h: Handler) => {
      handlerUpdate = h;
      return canal;
    }),
    subscribe: vi.fn((cb: (s: string) => void) => {
      cb('SUBSCRIBED');
      return canal;
    }),
  };
  return {
    supabase: {
      from: vi.fn(),
      rpc: vi.fn(),
      channel: vi.fn(() => canal),
      removeChannel: vi.fn(),
    },
  };
});

import { supabase } from '../lib/supabase';
import { useLive } from './useLive';

function linha(estado: object, nome: string | null = null) {
  return { estado: { ...ESTADO_PADRAO, ...estado }, updated_at: '2026-09-28T20:00:00Z', updated_by_nome: nome };
}

beforeEach(() => {
  vi.clearAllMocks();
  const single = vi.fn().mockResolvedValue({ data: linha({ titulo: 'DO BANCO' }, 'Ana'), error: null });
  vi.mocked(supabase.from).mockReturnValue({ select: () => ({ eq: () => ({ single }) }) } as never);
  vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never);
});
afterEach(() => vi.useRealTimers());

describe('useLive', () => {
  it('carrega o estado e quem editou', async () => {
    const { result } = renderHook(() => useLive());
    await waitFor(() => expect(result.current.status).toBe('ao_vivo'));
    expect(result.current.estado.titulo).toBe('DO BANCO');
    expect(result.current.editadoPor).toBe('Ana');
  });

  it('salvarDepois espera 400 ms e manda só o último valor', async () => {
    const { result } = renderHook(() => useLive());
    await waitFor(() => expect(result.current.status).toBe('ao_vivo'));
    vi.useFakeTimers();
    act(() => {
      result.current.salvarDepois({ titulo: 'A' });
      result.current.salvarDepois({ titulo: 'AB' });
    });
    expect(result.current.estado.titulo).toBe('AB');
    expect(supabase.rpc).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenCalledWith('atualizar_estado', { p_slug: 'principal', p_patch: { titulo: 'AB' } });
  });

  it('eco do Realtime não desfaz campo com gravação pendente', async () => {
    const { result } = renderHook(() => useLive());
    await waitFor(() => expect(result.current.status).toBe('ao_vivo'));
    vi.useFakeTimers();
    act(() => result.current.salvarDepois({ titulo: 'DIGITANDO' }));
    act(() => handlerUpdate!({ new: linha({ titulo: 'VELHO', timeA: 'OUTRO TIME' }) }));
    expect(result.current.estado.titulo).toBe('DIGITANDO');
    expect(result.current.estado.timeA).toBe('OUTRO TIME');
  });

  it('relógio e reiniciar usam as RPCs dedicadas', async () => {
    const { result } = renderHook(() => useLive());
    await waitFor(() => expect(result.current.status).toBe('ao_vivo'));
    await act(() => result.current.relogio('iniciar'));
    await act(() => result.current.reiniciarContagem());
    expect(supabase.rpc).toHaveBeenCalledWith('controlar_relogio', { p_slug: 'principal', p_acao: 'iniciar' });
    expect(supabase.rpc).toHaveBeenCalledWith('reiniciar_contagem', { p_slug: 'principal' });
  });

  it('fixture não toca no Supabase', () => {
    const { result } = renderHook(() => useLive({ fixture: { ...ESTADO_PADRAO, titulo: 'FIX' } }));
    expect(result.current.estado.titulo).toBe('FIX');
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
```

`src/live/usePix.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

type Handler = (p: { eventType: string; new: unknown; old: unknown }) => void;
let handler: Handler | null = null;

vi.mock('../lib/supabase', () => {
  const canal = {
    on: vi.fn((_t: string, _f: unknown, h: Handler) => {
      handler = h;
      return canal;
    }),
    subscribe: vi.fn(() => canal),
  };
  return { supabase: { from: vi.fn(), rpc: vi.fn(), channel: vi.fn(() => canal), removeChannel: vi.fn() } };
});

import { supabase } from '../lib/supabase';
import { usePix } from './usePix';

const pix = (id: string, extra = {}) => ({ id, nome: id, valor: '10.00', msg: '', origem: 'manual', externo_id: null, off: false, created_at: '2026-09-28T20:00:00Z', ...extra });

beforeEach(() => {
  vi.clearAllMocks();
  const limit = vi.fn().mockResolvedValue({ data: [pix('b'), pix('a')], error: null });
  vi.mocked(supabase.from).mockReturnValue({ select: () => ({ order: () => ({ limit }) }) } as never);
});

describe('usePix', () => {
  it('carrega, normaliza valor e aplica INSERT/UPDATE do Realtime', async () => {
    const { result } = renderHook(() => usePix());
    await waitFor(() => expect(result.current.lista).toHaveLength(2));
    expect(result.current.lista[0].valor).toBe(10);
    act(() => handler!({ eventType: 'INSERT', new: pix('c'), old: {} }));
    expect(result.current.lista[0].id).toBe('c');
    act(() => handler!({ eventType: 'UPDATE', new: pix('a', { off: true }), old: {} }));
    expect(result.current.lista.find((x) => x.id === 'a')!.off).toBe(true);
  });

  it('adicionarManual chama a RPC e devolve erro legível', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: { message: 'não autorizado' } } as never);
    const { result } = renderHook(() => usePix());
    let erro: string | null = null;
    await act(async () => {
      erro = await result.current.adicionarManual('Ana', 5);
    });
    expect(supabase.rpc).toHaveBeenCalledWith('adicionar_pix_manual', { p_nome: 'Ana', p_valor: 5, p_msg: '' });
    expect(erro).toBe('não autorizado');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/live`
Expected: FAIL (`useLive`/`usePix` não existem).

- [ ] **Step 3: Implementar**

`src/live/relogioServidor.tsx`:

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';

const RESSINCRONIZAR_MS = 30_000;
const OffsetCtx = createContext(0);

export function RelogioServidorProvider({ fixo = false, children }: { fixo?: boolean; children: ReactNode }) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (fixo) return;
    let ativo = true;
    async function sincronizar() {
      const antes = Date.now();
      const { data, error } = await supabase.rpc('hora_servidor');
      const depois = Date.now();
      if (!ativo || error || !data) return;
      const servidor = new Date(data as string).getTime() + (depois - antes) / 2;
      setOffset(servidor - depois);
    }
    sincronizar();
    const iv = setInterval(sincronizar, RESSINCRONIZAR_MS);
    return () => {
      ativo = false;
      clearInterval(iv);
    };
  }, [fixo]);

  return <OffsetCtx.Provider value={offset}>{children}</OffsetCtx.Provider>;
}

export function useAgora(tickMs = 1000): number {
  const offset = useContext(OffsetCtx);
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setAgora(Date.now()), tickMs);
    return () => clearInterval(iv);
  }, [tickMs]);
  return agora + offset;
}
```

`src/live/useLive.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ESTADO_PADRAO, type EstadoLive, type PatchLive } from './tipos';

export const SLUG = 'principal';
const DEBOUNCE_MS = 400;

export type StatusConexao = 'conectando' | 'ao_vivo' | 'reconectando';

interface Linha {
  estado: Partial<EstadoLive>;
  updated_at: string;
  updated_by_nome: string | null;
}

export function useLive(opcoes: { fixture?: EstadoLive } = {}) {
  const { fixture } = opcoes;
  const [servidor, setServidor] = useState<EstadoLive>(fixture ?? ESTADO_PADRAO);
  const [editado, setEditado] = useState<{ por: string | null; em: string | null }>({ por: null, em: null });
  const [status, setStatus] = useState<StatusConexao>(fixture ? 'ao_vivo' : 'conectando');
  // valores locais ainda não confirmados: sobrepõem o eco do Realtime
  const [pendentes, setPendentes] = useState<PatchLive>({});
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const ultimos = useRef(new Map<string, unknown>());

  useEffect(() => {
    if (fixture) return;
    let ativo = true;
    let carregou = false;

    function aplicar(l: Linha) {
      setServidor({ ...ESTADO_PADRAO, ...l.estado });
      setEditado({ por: l.updated_by_nome, em: l.updated_at });
    }

    supabase
      .from('salas')
      .select('estado, updated_at, updated_by_nome')
      .eq('slug', SLUG)
      .single()
      .then(({ data, error }: { data: Linha | null; error: unknown }) => {
        if (!ativo) return;
        if (error || !data) return setStatus('reconectando');
        aplicar(data);
        carregou = true;
        setStatus('ao_vivo');
      });

    const canal = supabase
      .channel(`live-${SLUG}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'salas', filter: `slug=eq.${SLUG}` }, (p: { new: Linha }) => {
        aplicar(p.new);
        carregou = true;
        setStatus('ao_vivo');
      })
      .subscribe((s: string) => {
        if (!ativo) return;
        if (s === 'SUBSCRIBED' && carregou) setStatus('ao_vivo');
        else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(s)) setStatus('reconectando');
      });

    return () => {
      ativo = false;
      supabase.removeChannel(canal);
      timers.current.forEach(clearTimeout);
    };
  }, [fixture]);

  const enviar = useCallback(async (patch: PatchLive) => {
    const { error } = await supabase.rpc('atualizar_estado', { p_slug: SLUG, p_patch: patch });
    if (error) setStatus('reconectando');
    // libera os campos cujo valor confirmado é o último digitado
    setPendentes((p) => {
      const novo = { ...p } as Record<string, unknown>;
      for (const [k, v] of Object.entries(patch)) if (ultimos.current.get(k) === v) delete novo[k];
      return novo as PatchLive;
    });
  }, []);

  const salvar = useCallback(
    async (patch: PatchLive) => {
      for (const [k, v] of Object.entries(patch)) ultimos.current.set(k, v);
      setPendentes((p) => ({ ...p, ...patch }));
      if (fixture) return;
      await enviar(patch);
    },
    [enviar, fixture],
  );

  const salvarDepois = useCallback(
    (patch: PatchLive) => {
      setPendentes((p) => ({ ...p, ...patch }));
      for (const [k, v] of Object.entries(patch)) {
        ultimos.current.set(k, v);
        clearTimeout(timers.current.get(k));
        if (fixture) continue;
        timers.current.set(
          k,
          setTimeout(() => {
            timers.current.delete(k);
            enviar({ [k]: v } as PatchLive);
          }, DEBOUNCE_MS),
        );
      }
    },
    [enviar, fixture],
  );

  const reiniciarContagem = useCallback(async () => {
    const { error } = await supabase.rpc('reiniciar_contagem', { p_slug: SLUG });
    if (error) setStatus('reconectando');
  }, []);

  const relogio = useCallback(async (acao: 'iniciar' | 'pausar' | 'zerar') => {
    const { error } = await supabase.rpc('controlar_relogio', { p_slug: SLUG, p_acao: acao });
    if (error) setStatus('reconectando');
  }, []);

  return {
    estado: { ...servidor, ...pendentes } as EstadoLive,
    status,
    editadoPor: editado.por,
    editadoEm: editado.em,
    salvar,
    salvarDepois,
    reiniciarContagem,
    relogio,
  };
}
```

`src/live/usePix.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { normalizarPix, type Pix } from './tipos';

const LIMITE = 100;

export function usePix() {
  const [lista, setLista] = useState<Pix[]>([]);

  useEffect(() => {
    let ativo = true;
    supabase
      .from('pix')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(LIMITE)
      .then(({ data }: { data: Pix[] | null }) => {
        if (ativo && data) setLista(data.map(normalizarPix));
      });

    const canal = supabase
      .channel('pix-painel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pix' }, (p: { eventType: string; new: Pix; old: Partial<Pix> }) => {
        setLista((atual) => {
          if (p.eventType === 'INSERT') return [normalizarPix(p.new), ...atual.filter((x) => x.id !== p.new.id)].slice(0, LIMITE);
          if (p.eventType === 'UPDATE') return atual.map((x) => (x.id === p.new.id ? normalizarPix(p.new) : x));
          if (p.eventType === 'DELETE') return atual.filter((x) => x.id !== p.old.id);
          return atual;
        });
      })
      .subscribe();

    return () => {
      ativo = false;
      supabase.removeChannel(canal);
    };
  }, []);

  const adicionarManual = useCallback(async (nome: string, valor: number, msg = '') => {
    const { error } = await supabase.rpc('adicionar_pix_manual', { p_nome: nome, p_valor: valor, p_msg: msg });
    return error ? error.message : null;
  }, []);

  const alternar = useCallback(async (id: string) => {
    await supabase.rpc('alternar_pix', { p_id: id });
  }, []);

  return { lista, adicionarManual, alternar };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/live`
Expected: PASS. Depois `npx tsc -b` sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/live/
git commit -m "feat(telas): estado ao vivo com gravação atrasada, relógio do servidor e lista de PIX"
```

---

### Task 4: Base das telas — palco, CSS, peças compartilhadas, rota `/tela/:id`

**Files:**
- Create: `src/telas/telas.css`, `src/telas/Palco.tsx`, `src/telas/SlotCamera.tsx`, `src/telas/Letreiro.tsx`, `src/telas/FaixaTicker.tsx`, `src/telas/index.ts`, `src/pages/TelaPage.tsx`
- Modify: `src/App.tsx`
- Test: `src/telas/pecas.test.tsx`

**Interfaces:**
- Consumes: `useLive`, `RelogioServidorProvider`, `ESTADO_REFERENCIA`, `itensLetreiro`, `TelaId`.
- Produces:
  - `interface PropsTela { estado: EstadoLive; previa?: boolean }` (em `src/telas/index.ts`)
  - `TELA_COMPONENTE: Record<TelaId, (p: PropsTela) => JSX.Element>` (em `src/telas/index.ts`; preenchido nas Tasks 5–7)
  - `<Palco escala?: number>` — div 1920×1080 `position:relative; overflow:hidden; transform-origin:0 0`
  - `<SlotCamera nome w h x y previa? />`
  - `<Letreiro itens: string[] classe?: string />` — itens com `<i className="us-ponto"/>` depois de cada um
  - `<Linha texto: string repeticoes: number />` — letreiro de fundo com texto repetido (duas metades para `usMarq` fazer loop)
  - `<FaixaTicker ticker: string />` — rodapé laranja (top 1000) com listra + letreiro
  - `usarFundoTransparente()` — hook que zera o fundo de `html`, `body`, `#root` no mount e restaura no unmount

**Regras de portabilidade (valem para as Tasks 4–7):**
1. Cada `style="..."` inline da referência vira classe em `telas.css` com as mesmas propriedades e valores, prefixo `t-` (ex.: `.t-inicio__titulo`). Valores dinâmicos (`{{ x }}`) viram `style={{ … }}` só para a propriedade dinâmica.
2. `{{ ... }}` vira a expressão equivalente do estado (tabela de bindings em cada tarefa).
3. `<sc-for>` vira `.map` com `key`; `<sc-if>` vira `&&`.
4. `<dc-import name="Slot Camera" nome w h style="left;top">` vira `<SlotCamera nome w h x y previa />`.
5. O span `<i style="display:inline-block;width:.3em;...">` vira `<i className="us-ponto" />`.
6. Keyframes: copiar as linhas 16–31 de `referencia/Telas Live.dc.html` literalmente para o topo de `telas.css`.
7. Fontes e textos fixos (ex.: "A LIVE JÁ VAI COMEÇAR") copiados literalmente.

- [ ] **Step 1: Testes que falham**

`src/telas/pecas.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Letreiro } from './Letreiro';
import { SlotCamera } from './SlotCamera';
import { FaixaTicker } from './FaixaTicker';

describe('peças das telas', () => {
  it('Letreiro põe uma bolinha CSS depois de cada item (sem caractere ●)', () => {
    const { container } = render(<Letreiro itens={['A', 'B']} />);
    expect(container.querySelectorAll('.us-ponto')).toHaveLength(2);
    expect(container.textContent).not.toContain('●');
  });

  it('SlotCamera mostra o nome; placeholder só na prévia', () => {
    const { rerender } = render(<SlotCamera nome="ANA" w={924} h={520} x={60} y={150} />);
    expect(screen.getByText('ANA')).toBeInTheDocument();
    expect(screen.queryByText('CÂMERA · 924×520')).toBeNull();
    rerender(<SlotCamera nome="ANA" w={924} h={520} x={60} y={150} previa />);
    expect(screen.getByText('CÂMERA · 924×520')).toBeInTheDocument();
  });

  it('FaixaTicker repete os itens 4x como a referência', () => {
    const { container } = render(<FaixaTicker ticker="UM ● DOIS" />);
    expect(container.querySelectorAll('.us-ponto')).toHaveLength(8);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/telas`
Expected: FAIL (módulos não existem).

- [ ] **Step 3: Implementar**

`src/telas/telas.css` — começa com as linhas 16–31 da referência (keyframes `usBlink` … `usSpin`) copiadas literalmente, depois:

```css
.us-ponto {
  display: inline-block;
  width: 0.3em;
  height: 0.3em;
  border-radius: 50%;
  background: currentColor;
  margin: 0 0.42em;
  vertical-align: 0.2em;
}

.us-palco {
  position: relative;
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  transform-origin: 0 0;
  font-family: 'Barlow Condensed', sans-serif;
}
.us-palco * { box-sizing: border-box; }

/* Slot Camera (referencia/Slot Camera.dc.html, linhas 10-15) */
.t-slot { position: absolute; background: #241d21; box-shadow: 0 0 0 4px #FF6B1F, 12px 12px 0 4px #8B6CF0; display: flex; align-items: center; justify-content: center; }
.t-slot__placeholder { font: 700 18px/1 'JetBrains Mono', monospace; letter-spacing: 0.14em; color: #4a3f44; }
.t-slot__tag { position: absolute; left: -4px; top: calc(100% + 4px); display: flex; align-items: stretch; }
.t-slot__led-box { width: 40px; background: #FF6B1F; display: flex; align-items: center; justify-content: center; }
.t-slot__led { width: 12px; height: 12px; border-radius: 50%; background: #1A1417; animation: usBlink 1.4s ease-in-out infinite; }
.t-slot__nome { background: #1A1417; color: #FFF3E0; font: 700 26px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.05em; text-transform: uppercase; padding: 9px 16px 8px; }

/* Faixa do ticker (Telas Live linhas 149-152) */
.t-ticker { position: absolute; left: 0; top: 1000px; width: 1920px; height: 56px; background: #FF6B1F; display: flex; align-items: center; overflow: hidden; }
.t-ticker__listra { flex-shrink: 0; height: 56px; width: 180px; background: repeating-linear-gradient(-45deg, #1A1417 0 14px, #FF6B1F 14px 28px); background-size: 56px 56px; animation: usStripe 1s linear infinite; }
.t-ticker__trilho { flex: 1; overflow: hidden; display: flex; align-items: center; height: 56px; }
.t-ticker__texto { display: flex; white-space: nowrap; font: 700 32px/1 'Barlow Condensed', sans-serif; letter-spacing: 0.08em; color: #1A1417; animation: usMarq 30s linear infinite; width: max-content; }

/* Letreiro de fundo (texto gigante repetido) */
.t-linha { display: flex; white-space: nowrap; width: max-content; }

/* Área reservada (chat/QR): moldura sem texto no OBS */
.t-reservado { position: absolute; box-shadow: 0 0 0 4px #8B6CF0; background: #241d21; display: flex; align-items: center; justify-content: center; font: 700 16px/1 'JetBrains Mono', monospace; letter-spacing: 0.14em; color: #4a3f44; }
```

`src/telas/Palco.tsx`:

```tsx
import { useEffect, type ReactNode } from 'react';
import './telas.css';

export function Palco({ escala = 1, children }: { escala?: number; children: ReactNode }) {
  return (
    <div className="us-palco" style={escala === 1 ? undefined : { transform: `scale(${escala})` }}>
      {children}
    </div>
  );
}

export function usarFundoTransparente() {
  useEffect(() => {
    const alvos = [document.documentElement, document.body, document.getElementById('root')].filter(Boolean) as HTMLElement[];
    const antes = alvos.map((el) => el.style.background);
    alvos.forEach((el) => (el.style.background = 'transparent'));
    return () => alvos.forEach((el, i) => (el.style.background = antes[i]));
  }, []);
}
```

`src/telas/SlotCamera.tsx`:

```tsx
interface Props { nome: string; w: number; h: number; x: number; y: number; previa?: boolean }

export function SlotCamera({ nome, w, h, x, y, previa }: Props) {
  return (
    <div className="t-slot" style={{ left: x, top: y, width: w, height: h }}>
      {previa && <div className="t-slot__placeholder">CÂMERA · {w}×{h}</div>}
      <div className="t-slot__tag">
        <div className="t-slot__led-box"><div className="t-slot__led" /></div>
        <div className="t-slot__nome">{nome}</div>
      </div>
    </div>
  );
}
```

`src/telas/Letreiro.tsx`:

```tsx
export function Letreiro({ itens }: { itens: string[] }) {
  return (
    <>
      {itens.map((t, i) => (
        <span key={i} style={{ whiteSpace: 'nowrap' }}>
          {t}
          <i className="us-ponto" />
        </span>
      ))}
    </>
  );
}

// Letreiro de fundo: duas metades iguais pra animação usMarq/usMarqR fechar o loop.
export function Linha({ texto, repeticoes }: { texto: string; repeticoes: number }) {
  const metade = (
    <span>
      {Array.from({ length: repeticoes }, (_, i) => (
        <span key={i}>{texto}<i className="us-ponto" /></span>
      ))}
    </span>
  );
  return <>{metade}{metade}</>;
}
```

Observação: `Linha` recebe um texto só; para letreiros alternados (ex.: Fim, "FIM DA LIVE ● VALEU"), passar `texto` como fragmento via prop `itens: string[]` — ajustar assinatura para `{ itens: string[]; repeticoes: number }` onde cada repetição imprime todos os itens. Usar essa assinatura:

```tsx
export function Linha({ itens, repeticoes }: { itens: string[]; repeticoes: number }) {
  const metade = (
    <span>
      {Array.from({ length: repeticoes }, (_, r) =>
        itens.map((t, i) => (
          <span key={`${r}-${i}`}>{t}<i className="us-ponto" /></span>
        )),
      )}
    </span>
  );
  return <>{metade}{metade}</>;
}
```

`src/telas/FaixaTicker.tsx`:

```tsx
import { itensLetreiro } from '../live/formatar';
import { Letreiro } from './Letreiro';

export function FaixaTicker({ ticker }: { ticker: string }) {
  const itens = itensLetreiro(ticker);
  return (
    <div className="t-ticker">
      <div className="t-ticker__listra" />
      <div className="t-ticker__trilho">
        <div className="t-ticker__texto">
          <Letreiro itens={[...itens, ...itens, ...itens, ...itens]} />
        </div>
      </div>
    </div>
  );
}
```

`src/telas/index.ts`:

```ts
import type { JSX } from 'react';
import type { EstadoLive, TelaId } from '../live/tipos';

export interface PropsTela {
  estado: EstadoLive;
  previa?: boolean;
}

// Preenchido nas Tasks 5–7. Tela ainda não portada renderiza nada.
export const TELA_COMPONENTE: Partial<Record<TelaId, (p: PropsTela) => JSX.Element>> = {};
```

`src/pages/TelaPage.tsx`:

```tsx
import { useParams, useSearchParams } from 'react-router-dom';
import { Palco, usarFundoTransparente } from '../telas/Palco';
import { TELA_COMPONENTE } from '../telas';
import { useLive } from '../live/useLive';
import { RelogioServidorProvider } from '../live/relogioServidor';
import { ESTADO_REFERENCIA } from '../live/fixture';
import type { TelaId } from '../live/tipos';

export function TelaPage() {
  const { id } = useParams<{ id: TelaId }>();
  const [params] = useSearchParams();
  const fixture = params.get('fixture') === 'referencia' ? ESTADO_REFERENCIA : undefined;
  return (
    <RelogioServidorProvider fixo={!!fixture}>
      <TelaAoVivo id={id} fixture={fixture} />
    </RelogioServidorProvider>
  );
}

function TelaAoVivo({ id, fixture }: { id?: TelaId; fixture?: typeof ESTADO_REFERENCIA }) {
  usarFundoTransparente();
  const { estado } = useLive({ fixture });
  const Tela = id ? TELA_COMPONENTE[id] : undefined;
  return <Palco>{Tela && <Tela estado={estado} />}</Palco>;
}
```

`src/App.tsx`: adicionar `<Route path="/tela/:id" element={<TelaPage />} />` (import de `./pages/TelaPage`). Rotas antigas continuam até a Task 14.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/telas && npx tsc -b`
Expected: PASS, sem erros de tipo.

- [ ] **Step 5: Commit**

```bash
git add src/telas src/pages/TelaPage.tsx src/App.tsx
git commit -m "feat(telas): palco 1920x1080 transparente, slot de câmera, letreiro e rota /tela/:id"
```

---

### Task 5: Telas Início, Intervalo, Fim, Técnico (+ Countdown)

**Files:**
- Create: `src/telas/Countdown.tsx`, `src/telas/TelaInicio.tsx`, `src/telas/TelaIntervalo.tsx`, `src/telas/TelaFim.tsx`, `src/telas/TelaTecnico.tsx`
- Modify: `src/telas/index.ts`, `src/telas/telas.css`
- Test: `src/telas/telas-simples.test.tsx`

**Interfaces:**
- Consumes: `PropsTela`, `Linha`, `useAgora`, `segundosRestantes`, `bolinhasCheias`, `mmss`.
- Produces: `<Countdown minutos timerInicio classe />` (texto `MM:SS`, re-renderiza sozinho a cada 250 ms); `<BolinhasProgresso minutos timerInicio />`; as 4 telas registradas em `TELA_COMPONENTE`.

Fontes de markup (portar pelas regras da Task 4):

| Tela | Linhas em `referencia/Telas Live.dc.html` | Bindings |
|---|---|---|
| Início | 46–74 | `{{ titulo }}` → `estado.titulo`; `{{ countdown }}` → `<Countdown>`; `{{ dots }}` → `<BolinhasProgresso>`; letreiros de fundo: 6 linhas `Linha` (UNIDADE SECRETA ×2, AO VIVO ×4, SINAL ABERTO ×4, UNIDADE SECRETA ×2, AO VIVO ×4, SINAL ABERTO ×4) com as animações da referência |
| Intervalo | 217–233 | `{{ letras }}` → `estado.msg.split('')` com `min-width` `0.4em` para espaço e `animation-delay: i*0.08s`; `{{ countdown }}` → `<Countdown>` |
| Fim | 78–100 | `{{ proximo }}` → `estado.proximo`; letreiro `Linha itens={['FIM DA LIVE','VALEU']} repeticoes={3}`; `offDots`: 10 bolinhas, a 10ª `#FFF3E0`, as outras `#FF6B1F`, `animation-delay: i*0.4s` (CSS inline só para o delay) |
| Técnico | 253–267 | nenhum (tudo fixo); letreiro `Linha itens={['PROBLEMAS TÉCNICOS','AGUENTA AÍ']} repeticoes={2}` |

- [ ] **Step 1: Testes que falham**

`src/telas/telas-simples.test.tsx`:

```tsx
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ESTADO_PADRAO } from '../live/tipos';

vi.mock('../live/relogioServidor', () => ({ useAgora: () => 1_000_000 + 61_000 }));

import { TelaInicio } from './TelaInicio';
import { TelaIntervalo } from './TelaIntervalo';
import { TelaFim } from './TelaFim';
import { TelaTecnico } from './TelaTecnico';

afterEach(() => vi.clearAllMocks());

describe('telas simples', () => {
  it('Início mostra título e countdown do servidor', () => {
    render(<TelaInicio estado={{ ...ESTADO_PADRAO, titulo: 'LIVE X', minutos: 5, timerInicio: 1_000_000 }} />);
    expect(screen.getByText('LIVE X')).toBeInTheDocument();
    expect(screen.getByText('03:59')).toBeInTheDocument();
    expect(screen.getByText('A LIVE JÁ VAI COMEÇAR')).toBeInTheDocument();
  });

  it('Início parado mostra o total', () => {
    render(<TelaInicio estado={{ ...ESTADO_PADRAO, minutos: 10, timerInicio: null }} />);
    expect(screen.getByText('10:00')).toBeInTheDocument();
  });

  it('Intervalo escreve a frase letra a letra e o countdown', () => {
    const { container } = render(<TelaIntervalo estado={{ ...ESTADO_PADRAO, msg: 'JÁ', minutos: 5, timerInicio: 1_000_000 }} />);
    expect(container.querySelectorAll('.t-intervalo__letra')).toHaveLength(2);
    expect(screen.getByText('03:59')).toBeInTheDocument();
  });

  it('Fim mostra a próxima live', () => {
    render(<TelaFim estado={{ ...ESTADO_PADRAO, proximo: 'SÁBADO, 20H' }} />);
    expect(screen.getByText('SÁBADO, 20H')).toBeInTheDocument();
  });

  it('Técnico mostra DEU RUIM', () => {
    render(<TelaTecnico estado={ESTADO_PADRAO} />);
    expect(screen.getAllByText('DEU RUIM')).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/telas/telas-simples.test.tsx`
Expected: FAIL (componentes não existem).

- [ ] **Step 3: Implementar**

`src/telas/Countdown.tsx`:

```tsx
import { useAgora } from '../live/relogioServidor';
import { bolinhasCheias, mmss, segundosRestantes } from '../live/relogios';

interface Props { minutos: number; timerInicio: number | null; className?: string }

export function Countdown({ minutos, timerInicio, className }: Props) {
  const agora = useAgora(250);
  return <div className={className}>{mmss(segundosRestantes(minutos, timerInicio, agora))}</div>;
}

// 10 bolinhas da Início (Telas Live linhas 61-65): cheias em tinta, a atual creme pulsando.
export function BolinhasProgresso({ minutos, timerInicio }: Omit<Props, 'className'>) {
  const agora = useAgora(1000);
  const total = Math.max(1, minutos * 60);
  const cheias = bolinhasCheias(segundosRestantes(minutos, timerInicio, agora), total);
  return (
    <div className="t-inicio__bolinhas">
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          className="t-inicio__bolinha"
          style={{
            background: i < cheias ? '#1A1417' : i === cheias ? '#FFF3E0' : 'transparent',
            animation: i === cheias ? 'usPulse 1s ease-in-out infinite' : 'none',
          }}
        />
      ))}
    </div>
  );
}
```

`src/telas/TelaIntervalo.tsx` (exemplo completo da portabilidade; as outras telas seguem o mesmo padrão com as linhas da tabela):

```tsx
import type { PropsTela } from '.';
import { Countdown } from './Countdown';

export function TelaIntervalo({ estado }: PropsTela) {
  return (
    <div className="t-intervalo">
      <div className="t-intervalo__giro" />
      <div className="t-intervalo__listra t-intervalo__listra--topo" />
      <div className="t-intervalo__listra t-intervalo__listra--base" />
      <div className="t-intervalo__centro">
        <div className="t-intervalo__selo">INTERVALO</div>
        <div className="t-intervalo__frase">
          {estado.msg.split('').map((ch, i) => (
            <span
              key={i}
              className="t-intervalo__letra"
              style={{ minWidth: ch === ' ' ? '0.4em' : 0, animationDelay: `${i * 0.08}s` }}
            >
              {ch === ' ' ? ' ' : ch}
            </span>
          ))}
        </div>
        <div className="t-intervalo__volta">
          <div className="t-intervalo__volta-rotulo">VOLTA EM</div>
          <Countdown className="t-intervalo__relogio" minutos={estado.minutos} timerInicio={estado.timerInicio} />
        </div>
      </div>
    </div>
  );
}
```

CSS correspondente (acrescentar em `telas.css`, valores das linhas 217–233):

```css
.t-intervalo { position: absolute; inset: 0; background: #FF6B1F; overflow: hidden; }
.t-intervalo__giro { position: absolute; left: 960px; top: 540px; width: 1500px; height: 1500px; margin: -750px 0 0 -750px; border-radius: 50%; background: repeating-conic-gradient(#F2601A 0 10deg, #FF6B1F 10deg 20deg); animation: usSpin 60s linear infinite; }
.t-intervalo__listra { position: absolute; left: 0; width: 100%; height: 60px; background: repeating-linear-gradient(-45deg, #1A1417 0 26px, #FF6B1F 26px 52px); background-size: 104px 60px; animation: usStripe 1.6s linear infinite; }
.t-intervalo__listra--topo { top: 0; }
.t-intervalo__listra--base { bottom: 0; animation-direction: reverse; }
.t-intervalo__centro { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 40px; }
.t-intervalo__selo { background: #1A1417; color: #FF6B1F; font: 700 26px/1 'JetBrains Mono', monospace; letter-spacing: 0.2em; padding: 14px 22px; }
.t-intervalo__frase { display: flex; font: 400 220px/1 'Bungee', sans-serif; color: #1A1417; text-shadow: 10px 10px 0 #FFF3E0; }
.t-intervalo__letra { display: inline-block; animation: usWave 2.2s ease-in-out infinite; }
.t-intervalo__volta { display: flex; align-items: center; gap: 20px; }
.t-intervalo__volta-rotulo { font: 700 34px/1 'JetBrains Mono', monospace; letter-spacing: 0.14em; color: #1A1417; }
.t-intervalo__relogio { background: #1A1417; color: #FFF3E0; font: 700 64px/1 'JetBrains Mono', monospace; padding: 12px 22px; box-shadow: 8px 8px 0 #8B6CF0; }
```

`TelaInicio.tsx`, `TelaFim.tsx`, `TelaTecnico.tsx`: portar as linhas da tabela pelas regras da Task 4 (classes `t-inicio__*`, `t-fim__*`, `t-tecnico__*`), usando `<Linha>`, `<Countdown className="t-inicio__relogio">` e `<BolinhasProgresso>`. O quadrado "US" com 10 bolinhas (linha 70) é fixo: 9 `#FF6B1F` + 1 `#FFF3E0`. Em Técnico, as três camadas "DEU RUIM" mantêm as animações `usGlA .35s steps(2)` e `usGlB .45s steps(2)`.

Registrar em `src/telas/index.ts`:

```ts
import { TelaInicio } from './TelaInicio';
import { TelaIntervalo } from './TelaIntervalo';
import { TelaFim } from './TelaFim';
import { TelaTecnico } from './TelaTecnico';
// ...
export const TELA_COMPONENTE: Partial<Record<TelaId, (p: PropsTela) => JSX.Element>> = {
  inicio: TelaInicio,
  intervalo: TelaIntervalo,
  fim: TelaFim,
  tecnico: TelaTecnico,
};
```

(Os imports de tela dentro de `index.ts` criam ciclo com `import type { PropsTela } from '.'` — é só tipo, o TS remove; se o bundler reclamar, mover `PropsTela` para `src/telas/tipos.ts`.)

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/telas && npx tsc -b`
Expected: PASS.

- [ ] **Step 5: Conferir no navegador**

Run (com `npm run dev` rodando): abrir `http://localhost:5173/tela/inicio?fixture=referencia` e `/tela/intervalo?fixture=referencia`, `/tela/fim?...`, `/tela/tecnico?...`. Conferir que abre sem erro no console e o fundo fora do palco é transparente.

- [ ] **Step 6: Commit**

```bash
git add src/telas
git commit -m "feat(telas): início, intervalo, fim e técnico com countdown pelo relógio do servidor"
```

---

### Task 6: Telas Host, Mesa, Lower

**Files:**
- Create: `src/telas/TelaHost.tsx`, `src/telas/TelaMesa.tsx`, `src/telas/TelaLower.tsx`
- Modify: `src/telas/index.ts`, `src/telas/telas.css`
- Test: `src/telas/telas-cameras.test.tsx`

**Interfaces:**
- Consumes: `PropsTela`, `SlotCamera`, `FaixaTicker`, `reais`, `partesPixLink`.
- Produces: 3 telas registradas em `TELA_COMPONENTE`.

| Tela | Linhas | Bindings |
|---|---|---|
| Host | 104–153 | `titulo`; `hostCams` escolhe o bloco (linhas 110–126): `'1'` → câmera `nomes[0]` 924×520 em (60,150) + caixa PIX (linhas 112–116: "MANDA O PIX", quadro 214×214, `partesPixLink(pixLink)` em duas linhas); `'2'` → `nomes[0..1]` 635×520 em x 60 e 725; `'3'` → `nomes[0]` 780×520 (60,150), `nomes[1]` 490×235 (870,150), `nomes[2]` 490×235 (870,435). Meta (linhas 128–133): `R$ {reais(metaAtual)}`, `/ R$ {reais(metaTotal)}`, `pct = min(100, round(metaAtual/max(1,metaTotal)*100)) + '%'` na largura da barra e no texto, `metaDesc`. Último PIX: `pixNome`, `R$ {reais(pixValor)}`. Top: `topNome`, `R$ {reais(topValor)}`. Chat reservado (linhas 145–148): manter a etiqueta "CHAT AO VIVO"; texto "CHAT · 440×800" só com `previa`. Quadro do QR: texto "QR CODE" só com `previa`. `<FaixaTicker ticker={estado.ticker} />` |
| Mesa | 271–288 | `titulo`; 6 câmeras `nomes[0..5]` 580×326 nas posições das linhas 278–283; `<FaixaTicker>` |
| Lower | 237–249 | `ltNome`, `funcao`; fundo `transparent` (na prévia, `#2A2226`, como `lowerBg` da referência) |

- [ ] **Step 1: Testes que falham**

`src/telas/telas-cameras.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ESTADO_PADRAO } from '../live/tipos';
import { TelaHost } from './TelaHost';
import { TelaMesa } from './TelaMesa';
import { TelaLower } from './TelaLower';

const nomes = ['ANA', 'BIA', 'CAIO', 'DUDA', 'EDU', 'FÁBIO'];

describe('telas com câmeras', () => {
  it('Host com 1 câmera mostra PIX link, meta, último e top formatados', () => {
    render(<TelaHost estado={{ ...ESTADO_PADRAO, nomes, hostCams: '1', metaAtual: 250.5, metaTotal: 500, pixNome: 'CAROL', pixValor: 10.5, topNome: 'TIAGO', topValor: 50 }} />);
    expect(screen.getByText('ANA')).toBeInTheDocument();
    expect(screen.queryByText('BIA')).toBeNull();
    expect(screen.getByText('R$ 250,50')).toBeInTheDocument();
    expect(screen.getAllByText('50%').length).toBeGreaterThan(0);
    expect(screen.getByText('CAROL')).toBeInTheDocument();
    expect(screen.getByText('R$ 10,50')).toBeInTheDocument();
    expect(screen.getByText('TIAGO')).toBeInTheDocument();
    expect(screen.getByText(/LIVEPIX\.GG\//)).toBeInTheDocument();
    expect(screen.queryByText('QR CODE')).toBeNull();
  });

  it('Host com 3 câmeras mostra 3 nomes e esconde a caixa do PIX', () => {
    render(<TelaHost estado={{ ...ESTADO_PADRAO, nomes, hostCams: '3' }} />);
    ['ANA', 'BIA', 'CAIO'].forEach((n) => expect(screen.getByText(n)).toBeInTheDocument());
    expect(screen.queryByText(/MANDA/)).toBeNull();
  });

  it('meta acima de 100% trava a barra em 100%', () => {
    const { container } = render(<TelaHost estado={{ ...ESTADO_PADRAO, metaAtual: 900, metaTotal: 500 }} />);
    expect((container.querySelector('.t-host__meta-barra-cheia') as HTMLElement).style.width).toBe('100%');
  });

  it('Mesa mostra as 6 câmeras', () => {
    render(<TelaMesa estado={{ ...ESTADO_PADRAO, nomes }} />);
    nomes.forEach((n) => expect(screen.getByText(n)).toBeInTheDocument());
  });

  it('Lower usa ltNome e funcao, não nomes[0]', () => {
    render(<TelaLower estado={{ ...ESTADO_PADRAO, nomes, ltNome: 'CONVIDADO', funcao: 'ZAGUEIRO' }} />);
    expect(screen.getByText('CONVIDADO')).toBeInTheDocument();
    expect(screen.getByText('ZAGUEIRO')).toBeInTheDocument();
    expect(screen.queryByText('ANA')).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/telas/telas-cameras.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar** — portar as linhas da tabela pelas regras da Task 4 (classes `t-host__*`, `t-mesa__*`, `t-lower__*`). A barra da meta usa a classe `t-host__meta-barra-cheia` com `style={{ width: pct }}`. Registrar `host`, `mesa`, `lower` em `TELA_COMPONENTE`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/telas && npx tsc -b`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/telas
git commit -m "feat(telas): host (1/2/3 câmeras, meta e PIX), mesa redonda e lower third"
```

---

### Task 7: Telas Futebol e Filme (+ RelogioJogo, enquete)

**Files:**
- Create: `src/telas/RelogioJogo.tsx`, `src/telas/TelaFutebol.tsx`, `src/telas/TelaFilme.tsx`
- Modify: `src/telas/index.ts`, `src/telas/telas.css`
- Test: `src/telas/telas-jogo.test.tsx`

**Interfaces:**
- Consumes: `useAgora`, `segundosJogo`, `rotuloJogo`, `SlotCamera`, `FaixaTicker`.
- Produces: `<RelogioJogo estado className />` (texto `67'`); 2 telas registradas.

| Tela | Linhas | Bindings |
|---|---|---|
| Futebol | 157–192 | `timeA`, `timeB`, `golsA`, `golsB`; relógio → `<RelogioJogo>` (`floor(segundosJogo/60) + "'"`); rótulo → `rotuloJogo(estado)`; câmeras `nomes[0..1]` 645×400 em (60,200) e (735,200); enquete (linhas 175–186): título "QUEM GANHA?" **sem** a linha "VOTA NO CHAT…", 3 barras `[timeA, casa, #FF6B1F, 0s]`, `['EMPATE', empate, #FFF3E0, .15s]`, `[timeB, fora, #8B6CF0, .3s]` com `pct = clamp(0,100) + '%'`; bloco inteiro só se `enquete.mostrar`; chat reservado 440×910 (linha 187), texto só na prévia; `<FaixaTicker>` |
| Filme | 196–213 | 4 câmeras `nomes[0..3]` 645×340 (linhas 202–205); `filme`, `episodio`; chat reservado 440×750 (linha 206), texto só na prévia |

- [ ] **Step 1: Testes que falham**

`src/telas/telas-jogo.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ESTADO_PADRAO } from '../live/tipos';

vi.mock('../live/relogioServidor', () => ({ useAgora: () => 2_000_000 }));

import { TelaFutebol } from './TelaFutebol';
import { TelaFilme } from './TelaFilme';

describe('futebol e filme', () => {
  it('placar, relógio rodando pelo servidor e rótulo OUTRO', () => {
    render(
      <TelaFutebol
        estado={{ ...ESTADO_PADRAO, timeA: 'FLA', timeB: 'VAS', golsA: 2, golsB: 1, clockRodando: true, clockInicio: 2_000_000 - 90_000, clockAcumulado: 600, jogo: 'OUTRO', jogoOutro: 'PÊNALTIS' }}
      />,
    );
    expect(screen.getAllByText('FLA').length).toBeGreaterThan(0);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText("11'")).toBeInTheDocument();
    expect(screen.getByText('PÊNALTIS')).toBeInTheDocument();
  });

  it('enquete escondida some inteira; mostrada usa os nomes dos times e não promete voto no chat', () => {
    const { rerender } = render(<TelaFutebol estado={{ ...ESTADO_PADRAO, enquete: { casa: 50, empate: 20, fora: 30, mostrar: false } }} />);
    expect(screen.queryByText('QUEM GANHA?')).toBeNull();
    rerender(<TelaFutebol estado={{ ...ESTADO_PADRAO, timeA: 'FLA', enquete: { casa: 50, empate: 20, fora: 30, mostrar: true } }} />);
    expect(screen.getByText('QUEM GANHA?')).toBeInTheDocument();
    expect(screen.getByText('EMPATE')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.queryByText(/VOTA NO CHAT/)).toBeNull();
  });

  it('Filme mostra 4 câmeras, filme e episódio', () => {
    render(<TelaFilme estado={{ ...ESTADO_PADRAO, filme: 'TITANIC', episodio: 'T2 · E1' }} />);
    expect(screen.getByText('TITANIC')).toBeInTheDocument();
    expect(screen.getByText('T2 · E1')).toBeInTheDocument();
    expect(screen.getByText('NOME 04')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/telas/telas-jogo.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar**

`src/telas/RelogioJogo.tsx`:

```tsx
import { useAgora } from '../live/relogioServidor';
import { segundosJogo } from '../live/relogios';
import type { EstadoLive } from '../live/tipos';

type Relogio = Pick<EstadoLive, 'clockInicio' | 'clockAcumulado' | 'clockRodando'>;

export function RelogioJogo({ estado, className }: { estado: Relogio; className?: string }) {
  const agora = useAgora(1000);
  return <div className={className}>{Math.floor(segundosJogo(estado, agora) / 60)}'</div>;
}
```

Telas: portar as linhas da tabela pelas regras da Task 4 (classes `t-futebol__*`, `t-filme__*`). Registrar `futebol` e `filme`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/telas && npx tsc -b`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/telas
git commit -m "feat(telas): futebol com relógio do servidor e enquete manual, e filme/série"
```

---

### Task 8: Comparação visual com a referência

**Files:**
- Create: `scripts/package.json`, `scripts/comparar-telas.mjs`, `docs/prints/.gitkeep`

**Interfaces:**
- Consumes: `/tela/:id?fixture=referencia` (Task 4), `referencia/Telas Live.dc.html?tela=X`.
- Produces: `docs/prints/<id>-lado-a-lado.png` para as 9 telas.

- [ ] **Step 1: Script**

`scripts/package.json`:

```json
{ "private": true, "type": "module", "dependencies": { "playwright-core": "^1" } }
```

`scripts/comparar-telas.mjs`:

```js
// Uso: (npm run dev rodando em :5173)  node scripts/comparar-telas.mjs
// Tira print 1920x1080 da referência e da nossa tela com os mesmos dados e junta lado a lado.
import { chromium } from 'playwright-core';
import { readdirSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const TELAS = ['inicio', 'host', 'futebol', 'filme', 'mesa', 'intervalo', 'lower', 'tecnico', 'fim'];
const base = resolve(process.env.HOME, '.cache/ms-playwright');
const pasta = readdirSync(base).find((d) => /^chromium-\d+$/.test(d));
const exe = resolve(base, pasta, readdirSync(resolve(base, pasta)).find((d) => d.startsWith('chrome-linux')), 'chrome');
const ref = 'file://' + resolve('referencia/Telas Live.dc.html');
const saida = resolve('docs/prints');
mkdirSync(saida, { recursive: true });

const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
// congela animações pra comparar posição, não quadro de animação
const congelar = `*,*::before,*::after{animation-play-state:paused!important;animation-delay:-0.001s!important}`;

for (const id of TELAS) {
  await page.goto(`${ref}?tela=${id}`);
  await page.addStyleTag({ content: congelar });
  await page.waitForTimeout(1500);
  const a = await page.screenshot({ type: 'png' });
  await page.goto(`http://localhost:5173/tela/${id}?fixture=referencia`);
  await page.addStyleTag({ content: congelar });
  await page.waitForTimeout(1500);
  const b = await page.screenshot({ type: 'png' });
  const html = `<body style="margin:0;display:flex;gap:20px;background:#555">
    <figure style="margin:0"><figcaption style="font:24px sans-serif;color:#fff">REFERÊNCIA · ${id}</figcaption><img src="data:image/png;base64,${a.toString('base64')}"></figure>
    <figure style="margin:0"><figcaption style="font:24px sans-serif;color:#fff">NOSSA · ${id}</figcaption><img src="data:image/png;base64,${b.toString('base64')}"></figure></body>`;
  const lado = await browser.newPage({ viewport: { width: 3860, height: 1120 } });
  await lado.setContent(html);
  await lado.screenshot({ path: resolve(saida, `${id}-lado-a-lado.png`) });
  await lado.close();
  console.log('ok', id);
}
await browser.close();
```

- [ ] **Step 2: Rodar**

Run: `(cd scripts && npm i) && node scripts/comparar-telas.mjs`
Expected: 9 linhas `ok <id>` e 9 PNGs em `docs/prints/`.

- [ ] **Step 3: Revisar cada print e corrigir diferenças**

Abrir cada PNG (Read). Diferenças aceitas (deliberadas): linha "VOTA NO CHAT" ausente no Futebol; placeholders "CÂMERA · W×H", "CHAT · …", "QR CODE" ausentes (a nossa renderiza como OBS); fundo do lower transparente (a referência pinta `#2A2226` fora do OBS — conferir que a posição do cartão bate). Qualquer outra diferença (posição, tamanho, cor, fonte, quebra de linha) é bug: corrigir o CSS da tela e rodar de novo até bater.

- [ ] **Step 4: Commit**

```bash
git add scripts/package.json scripts/comparar-telas.mjs docs/prints
git commit -m "chore: comparação visual das 9 telas com a referência"
```

(Adicionar `scripts/node_modules` ao `.gitignore`.)

---

### Task 9: `/alerta`

**Files:**
- Create: `src/alerta/fila.ts`, `src/alerta/CartaoAlerta.tsx`, `src/alerta/alerta.css`, `src/pages/AlertaPage.tsx`
- Modify: `src/App.tsx`
- Test: `src/alerta/fila.test.ts`, `src/alerta/AlertaPage.test.tsx`

**Interfaces:**
- Consumes: `Pix`, `normalizarPix`, `reais`, `Palco`, `usarFundoTransparente`, `supabase`.
- Produces:
  - `type EstadoFila = { atual: Pix | null; fase: 'entrando'|'parado'|'saindo'|null; espera: Pix[] }`
  - `type AcaoFila = { tipo: 'novo'; pix: Pix } | { tipo: 'mudou'; pix: Pix } | { tipo: 'avancar' }`
  - `reduzirFila(s: EstadoFila, a: AcaoFila): EstadoFila`
  - `DURACAO = { entrar: 500, parado: 6000, sair: 500 }`

- [ ] **Step 1: Testes da fila que falham**

`src/alerta/fila.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { reduzirFila, type EstadoFila } from './fila';
import type { Pix } from '../live/tipos';

const p = (id: string, off = false): Pix => ({ id, nome: id, valor: 10, msg: '', origem: 'manual', externo_id: null, off, created_at: '' });
const vazio: EstadoFila = { atual: null, fase: null, espera: [] };

describe('fila do alerta', () => {
  it('primeiro PIX entra direto; os outros esperam na ordem', () => {
    let s = reduzirFila(vazio, { tipo: 'novo', pix: p('a') });
    s = reduzirFila(s, { tipo: 'novo', pix: p('b') });
    s = reduzirFila(s, { tipo: 'novo', pix: p('c') });
    expect(s.atual?.id).toBe('a');
    expect(s.fase).toBe('entrando');
    expect(s.espera.map((x) => x.id)).toEqual(['b', 'c']);
  });

  it('avança entrando → parado → saindo → próximo, sem pular', () => {
    let s = reduzirFila(vazio, { tipo: 'novo', pix: p('a') });
    s = reduzirFila(s, { tipo: 'novo', pix: p('b') });
    s = reduzirFila(s, { tipo: 'avancar' });
    expect(s.fase).toBe('parado');
    s = reduzirFila(s, { tipo: 'avancar' });
    expect(s.fase).toBe('saindo');
    s = reduzirFila(s, { tipo: 'avancar' });
    expect(s.atual?.id).toBe('b');
    expect(s.fase).toBe('entrando');
    s = reduzirFila(reduzirFila(reduzirFila(s, { tipo: 'avancar' }), { tipo: 'avancar' }), { tipo: 'avancar' });
    expect(s).toEqual(vazio);
  });

  it('PIX que chega já "não contar" é ignorado', () => {
    expect(reduzirFila(vazio, { tipo: 'novo', pix: p('a', true) })).toEqual(vazio);
  });

  it('marcar "não contar" tira da espera, mas não corta o que está na tela', () => {
    let s = reduzirFila(vazio, { tipo: 'novo', pix: p('a') });
    s = reduzirFila(s, { tipo: 'novo', pix: p('b') });
    s = reduzirFila(s, { tipo: 'mudou', pix: p('b', true) });
    expect(s.espera).toEqual([]);
    s = reduzirFila(s, { tipo: 'mudou', pix: p('a', true) });
    expect(s.atual?.id).toBe('a');
  });

  it('voltar a contar não re-enfileira; PIX repetido não entra duas vezes', () => {
    let s = reduzirFila(vazio, { tipo: 'novo', pix: p('a') });
    s = reduzirFila(s, { tipo: 'mudou', pix: p('z', false) });
    expect(s.espera).toEqual([]);
    s = reduzirFila(s, { tipo: 'novo', pix: p('a') });
    expect(s.espera).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/alerta`
Expected: FAIL.

- [ ] **Step 3: Implementar a fila**

`src/alerta/fila.ts`:

```ts
import type { Pix } from '../live/tipos';

export const DURACAO = { entrar: 500, parado: 6000, sair: 500 } as const;

export type Fase = 'entrando' | 'parado' | 'saindo';
export interface EstadoFila { atual: Pix | null; fase: Fase | null; espera: Pix[] }
export type AcaoFila = { tipo: 'novo'; pix: Pix } | { tipo: 'mudou'; pix: Pix } | { tipo: 'avancar' };

export const FILA_VAZIA: EstadoFila = { atual: null, fase: null, espera: [] };

export function reduzirFila(s: EstadoFila, a: AcaoFila): EstadoFila {
  switch (a.tipo) {
    case 'novo': {
      if (a.pix.off) return s;
      if (s.atual?.id === a.pix.id || s.espera.some((x) => x.id === a.pix.id)) return s;
      if (!s.atual) return { atual: a.pix, fase: 'entrando', espera: [] };
      return { ...s, espera: [...s.espera, a.pix] };
    }
    case 'mudou':
      if (!a.pix.off) return s;
      return { ...s, espera: s.espera.filter((x) => x.id !== a.pix.id) };
    case 'avancar':
      if (s.fase === 'entrando') return { ...s, fase: 'parado' };
      if (s.fase === 'parado') return { ...s, fase: 'saindo' };
      if (s.fase === 'saindo') {
        const [prox, ...resto] = s.espera;
        return prox ? { atual: prox, fase: 'entrando', espera: resto } : FILA_VAZIA;
      }
      return s;
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/alerta/fila.test.ts`
Expected: PASS.

- [ ] **Step 5: Teste da página (falha)**

`src/alerta/AlertaPage.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';

type H = (p: { eventType: string; new: unknown }) => void;
let h: H | null = null;
vi.mock('../lib/supabase', () => {
  const canal = { on: vi.fn((_a: string, _b: unknown, cb: H) => { h = cb; return canal; }), subscribe: vi.fn(() => canal) };
  return { supabase: { channel: vi.fn(() => canal), removeChannel: vi.fn() } };
});

import { AlertaPage } from '../pages/AlertaPage';

describe('AlertaPage', () => {
  it('mostra o PIX novo com valor formatado e some depois de 7 s', async () => {
    vi.useFakeTimers();
    render(<AlertaPage />);
    act(() => h!({ eventType: 'INSERT', new: { id: '1', nome: 'Carol', valor: '12.50', msg: 'salve', origem: 'manual', externo_id: null, off: false, created_at: '' } }));
    expect(screen.getByText('Carol')).toBeInTheDocument();
    expect(screen.getByText('R$ 12,50')).toBeInTheDocument();
    expect(screen.getByText('salve')).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(7100); });
    expect(screen.queryByText('Carol')).toBeNull();
    vi.useRealTimers();
  });
});
```

Run: `npx vitest run src/alerta` → FAIL.

- [ ] **Step 6: Implementar página, cartão e som**

`src/pages/AlertaPage.tsx`:

```tsx
import { useEffect, useReducer, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { normalizarPix, type Pix } from '../live/tipos';
import { DURACAO, FILA_VAZIA, reduzirFila } from '../alerta/fila';
import { CartaoAlerta } from '../alerta/CartaoAlerta';
import { Palco, usarFundoTransparente } from '../telas/Palco';

export function AlertaPage() {
  usarFundoTransparente();
  const [fila, despachar] = useReducer(reduzirFila, FILA_VAZIA);
  const som = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const canal = supabase
      .channel('pix-alerta')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pix' }, (p: { eventType: string; new: Pix }) => {
        if (p.eventType === 'INSERT') despachar({ tipo: 'novo', pix: normalizarPix(p.new) });
        else if (p.eventType === 'UPDATE') despachar({ tipo: 'mudou', pix: normalizarPix(p.new) });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  useEffect(() => {
    if (!fila.fase) return;
    if (fila.fase === 'entrando') {
      som.current ??= new Audio('/alerta.mp3');
      try {
        som.current.currentTime = 0;
        som.current.play()?.catch(() => {}); // sem arquivo ou autoplay bloqueado: segue mudo
      } catch {
        // jsdom/navegador sem suporte: segue mudo
      }
    }
    const t = setTimeout(() => despachar({ tipo: 'avancar' }), DURACAO[fila.fase === 'entrando' ? 'entrar' : fila.fase === 'parado' ? 'parado' : 'sair']);
    return () => clearTimeout(t);
  }, [fila.fase, fila.atual?.id]);

  return <Palco>{fila.atual && fila.fase && <CartaoAlerta pix={fila.atual} fase={fila.fase} />}</Palco>;
}
```

Em jsdom, `play()` não é implementado (pode lançar ou devolver `undefined`); por isso o `try` e o `?.catch`.

`src/alerta/CartaoAlerta.tsx` (visual novo na estética das telas; canto inferior esquerdo):

```tsx
import type { Pix } from '../live/tipos';
import type { Fase } from './fila';
import { reais } from '../live/formatar';
import './alerta.css';

export function CartaoAlerta({ pix, fase }: { pix: Pix; fase: Fase }) {
  return (
    <div className={`a-alerta a-alerta--${fase}`}>
      <div className="a-alerta__listra" />
      <div className="a-alerta__corpo">
        <div className="a-alerta__topo">
          <div className="a-alerta__selo"><span className="a-alerta__led" />PIX NA ÁREA</div>
          <div className="a-alerta__valor">R$ {reais(pix.valor)}</div>
        </div>
        <div className="a-alerta__nome">{pix.nome}</div>
        {pix.msg && <div className="a-alerta__msg">{pix.msg}</div>}
      </div>
    </div>
  );
}
```

`src/alerta/alerta.css`:

```css
@keyframes aEntra { 0% { transform: translateX(-140%) skewX(-14deg); } 70% { transform: translateX(12px) skewX(2deg); } 100% { transform: none; } }
@keyframes aSai { from { transform: none; opacity: 1; } to { transform: translateX(-140%) skewX(-10deg); opacity: 0; } }
@keyframes aStripe { from { background-position: 0 0; } to { background-position: 104px 0; } }
@keyframes aBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }
@keyframes aPop { 0% { transform: scale(0.4); } 60% { transform: scale(1.2); } 100% { transform: scale(1); } }

.a-alerta { position: absolute; left: 80px; bottom: 140px; width: 760px; filter: drop-shadow(12px 12px 0 #8B6CF0); }
.a-alerta--entrando { animation: aEntra 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
.a-alerta--saindo { animation: aSai 0.5s cubic-bezier(0.7, 0, 0.8, 0.2) both; }
.a-alerta__listra { height: 18px; background: repeating-linear-gradient(-45deg, #1A1417 0 13px, #FF6B1F 13px 26px); background-size: 104px 18px; animation: aStripe 0.8s linear infinite; }
.a-alerta__corpo { background: #FF6B1F; padding: 22px 30px 26px; display: flex; flex-direction: column; gap: 10px; }
.a-alerta__topo { display: flex; justify-content: space-between; align-items: center; gap: 20px; }
.a-alerta__selo { display: flex; align-items: center; gap: 12px; background: #1A1417; color: #FF6B1F; font: 700 22px/1 'JetBrains Mono', monospace; letter-spacing: 0.16em; padding: 10px 14px; }
.a-alerta__led { width: 12px; height: 12px; border-radius: 50%; background: #FF6B1F; animation: aBlink 0.8s infinite; }
.a-alerta__valor { font: 400 72px/1 'Bungee', sans-serif; color: #1A1417; animation: aPop 0.45s 0.3s both; }
.a-alerta__nome { font: 700 64px/1 'Barlow Condensed', sans-serif; color: #1A1417; text-transform: uppercase; letter-spacing: 0.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.a-alerta__msg { background: #1A1417; color: #FFF3E0; font: 600 34px/1.15 'Barlow Condensed', sans-serif; padding: 12px 16px; text-wrap: pretty; }
```

`src/App.tsx`: `<Route path="/alerta" element={<AlertaPage />} />`.

- [ ] **Step 7: Rodar e ver passar**

Run: `npx vitest run src/alerta && npx tsc -b`
Expected: PASS.

- [ ] **Step 8: Print para o usuário**

Criar rota de teste só em dev: `/alerta?teste=1` despacha um PIX fictício (`{ nome: 'TIAGÃO', valor: 25, msg: 'PRA PIZZA DA RAPAZIADA' }`) a cada 8 s (usar `import.meta.env.DEV && params.get('teste')`). Tirar print 1920×1080 com o script de playwright (mesmo executável da Task 8) em fundo quadriculado cinza para mostrar a transparência, salvar em `docs/prints/alerta.png`.

- [ ] **Step 9: Commit**

```bash
git add src/alerta src/pages/AlertaPage.tsx src/App.tsx docs/prints/alerta.png
git commit -m "feat(alerta): /alerta com fila de PIX, 6s por alerta e som opcional"
```

---

### Task 10: Painel — estrutura, topo, lista de telas, prévia, campo de texto

**Files:**
- Create: `src/painel/painel.css`, `src/painel/Topo.tsx`, `src/painel/ListaTelas.tsx`, `src/painel/Previa.tsx`, `src/painel/CampoTexto.tsx`
- Modify: `src/pages/PainelPage.tsx` (reescrever), `src/pages/PainelPage.test.tsx` (reescrever)
- Test: `src/painel/CampoTexto.test.tsx`, `src/pages/PainelPage.test.tsx`

**Interfaces:**
- Consumes: `useLive`, `useAuth` (`papel`), `TELAS`, `TELA_COMPONENTE`, `Palco`, `RelogioServidorProvider`, `formatarTempoRelativo` (mover de `src/lib/tempo.ts` para `src/live/formatar.ts` nesta tarefa, com o teste).
- Produces:
  - `<CampoTexto valor: string; aoMudar(v: string): void; maiusculo?: boolean; tipo?: 'text'|'number'; placeholder?; rotulo? />` — mantém valor local enquanto tem foco; fora do foco espelha `valor`.
  - `<Previa tela: TelaId; estado: EstadoLive />` — mede a largura do contêiner (ResizeObserver) e aplica `escala = largura/1920` no `Palco`, com `previa` ligado.
  - `<Topo status editadoPor editadoEm ehAdmin aoAbrirGalera />`
  - `<ListaTelas atual aoEscolher />` — teclas 1–9 fora de campos.

Layout: portar `referencia/Painel US.dc.html` linhas 21–62 (topo, coluna TELAS, prévia) e 165–171 (título e letreiro) pelas regras da Task 4 (classes `p-*` em `painel.css`). Colunas: `grid-template-columns: 220px minmax(0,1fr) 400px`; abaixo de 1100 px vira uma coluna, lista de telas em linha rolável (`overflow-x:auto; display:flex`).

- [ ] **Step 1: Testes que falham**

`src/painel/CampoTexto.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CampoTexto } from './CampoTexto';

describe('CampoTexto', () => {
  it('converte pra maiúsculas e avisa a cada tecla', () => {
    const aoMudar = vi.fn();
    render(<CampoTexto valor="" aoMudar={aoMudar} maiusculo rotulo="TÍTULO" />);
    fireEvent.change(screen.getByLabelText('TÍTULO'), { target: { value: 'abc' } });
    expect(aoMudar).toHaveBeenLastCalledWith('ABC');
  });

  it('com foco, ignora valor novo vindo de fora; sem foco, acompanha', () => {
    const { rerender } = render(<CampoTexto valor="A" aoMudar={() => {}} rotulo="X" />);
    const input = screen.getByLabelText('X') as HTMLInputElement;
    input.focus();
    fireEvent.change(input, { target: { value: 'MEU' } });
    rerender(<CampoTexto valor="ECO VELHO" aoMudar={() => {}} rotulo="X" />);
    expect(input.value).toBe('MEU');
    input.blur();
    rerender(<CampoTexto valor="SERVIDOR" aoMudar={() => {}} rotulo="X" />);
    expect(input.value).toBe('SERVIDOR');
  });
});
```

`src/pages/PainelPage.test.tsx` (substitui o antigo):

```tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ESTADO_PADRAO } from '../live/tipos';

const salvarDepois = vi.fn();
vi.mock('../live/useLive', () => ({
  SLUG: 'principal',
  useLive: () => ({ estado: { ...ESTADO_PADRAO, titulo: 'LIVE' }, status: 'ao_vivo', editadoPor: 'Ana', editadoEm: new Date().toISOString(), salvar: vi.fn(), salvarDepois, reiniciarContagem: vi.fn(), relogio: vi.fn() }),
}));
vi.mock('../live/usePix', () => ({ usePix: () => ({ lista: [], adicionarManual: vi.fn(), alternar: vi.fn() }) }));
vi.mock('../live/relogioServidor', () => ({ useAgora: () => Date.now(), RelogioServidorProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ papel: 'admin', sessao: {}, carregando: false, erro: null }) }));

import { PainelPage } from './PainelPage';

describe('PainelPage', () => {
  it('mostra as 9 telas, o aviso de prévia, status e editado por', () => {
    render(<MemoryRouter><PainelPage /></MemoryRouter>);
    expect(screen.getByText('PRÉVIA · NÃO É O QUE ESTÁ NO AR')).toBeInTheDocument();
    expect(screen.getByText('TELAS SINCRONIZADAS')).toBeInTheDocument();
    expect(screen.getByText(/editado por Ana/)).toBeInTheDocument();
    ['INÍCIO', 'HOST', 'FUTEBOL', 'FILME/SÉRIE', 'MESA REDONDA', 'INTERVALO', 'LOWER THIRD', 'TÉCNICO', 'FIM'].forEach((t) =>
      expect(screen.getAllByText(t).length).toBeGreaterThan(0),
    );
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });

  it('título grava com atraso (salvarDepois)', () => {
    render(<MemoryRouter><PainelPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('TÍTULO DA LIVE · TODAS AS CENAS'), { target: { value: 'nova' } });
    expect(salvarDepois).toHaveBeenCalledWith({ titulo: 'NOVA' });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/painel src/pages/PainelPage.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar**

`src/painel/CampoTexto.tsx`:

```tsx
import { useEffect, useId, useState } from 'react';

interface Props {
  valor: string;
  aoMudar: (v: string) => void;
  maiusculo?: boolean;
  tipo?: 'text' | 'number';
  placeholder?: string;
  rotulo?: string;
  className?: string;
}

export function CampoTexto({ valor, aoMudar, maiusculo, tipo = 'text', placeholder, rotulo, className }: Props) {
  const id = useId();
  const [local, setLocal] = useState(valor);
  const [foco, setFoco] = useState(false);
  useEffect(() => {
    if (!foco) setLocal(valor);
  }, [valor, foco]);

  return (
    <div className="p-campo">
      {rotulo && <label htmlFor={id} className="p-rotulo">{rotulo}</label>}
      <input
        id={id}
        type={tipo}
        className={className ?? 'p-input'}
        value={local}
        placeholder={placeholder}
        onFocus={() => setFoco(true)}
        onBlur={() => setFoco(false)}
        onChange={(e) => {
          const v = maiusculo ? e.target.value.toUpperCase() : e.target.value;
          setLocal(v);
          aoMudar(v);
        }}
      />
    </div>
  );
}
```

`src/painel/Previa.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { Palco } from '../telas/Palco';
import { TELA_COMPONENTE } from '../telas';
import type { EstadoLive, TelaId } from '../live/tipos';

export function Previa({ tela, estado }: { tela: TelaId; estado: EstadoLive }) {
  const caixa = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(0);
  useEffect(() => {
    if (!caixa.current || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setLargura(e.contentRect.width));
    ro.observe(caixa.current);
    return () => ro.disconnect();
  }, []);
  const Tela = TELA_COMPONENTE[tela];
  return (
    <div ref={caixa} className="p-previa">
      {largura > 0 && <Palco escala={largura / 1920}>{Tela && <Tela estado={estado} previa />}</Palco>}
    </div>
  );
}
```

`.p-previa { position: relative; width: 100%; aspect-ratio: 16/9; overflow: hidden; background: #0f0c0e; }` e `.p-previa .us-palco { position: absolute; left: 0; top: 0; }`.

`src/painel/Topo.tsx`: portar linhas 22–38 da referência; status = `[{ label: 'TELAS SINCRONIZADAS', aceso: status === 'ao_vivo', extra: status === 'reconectando' ? 'RECONECTANDO…' : '' }, { label: 'LIVEPIX', aceso: false, extra: 'EM BREVE' }, { label: 'CHAT', aceso: false, extra: 'EM BREVE' }]` (bolinha `#FF6B1F` piscando quando aceso, `#3a3035` quando não); `editado por {editadoPor} {formatarTempoRelativo(Date.parse(editadoEm), useAgora(15000))}` em `#8a7f84` 11px; botões GALERA, ADMIN (link `/admin`, só `ehAdmin`), SAIR (`supabase.auth.signOut()`).

`src/painel/ListaTelas.tsx`: portar linhas 40–50; botão ativo `bg #FF6B1F`, `fg #1A1417`, `box-shadow 6px 6px 0 #8B6CF0`; inativo `transparent`, `#FFF3E0`, `inset 0 0 0 2px #2A2226`; número 1–9 à esquerda. `useEffect` com `keydown`: se `e.target` não for `input/textarea/select` e a tecla for `1`–`9`, escolhe `TELAS[n-1]`.

`src/pages/PainelPage.tsx`:

```tsx
import { useState } from 'react';
import { useLive } from '../live/useLive';
import { useAuth } from '../hooks/useAuth';
import { RelogioServidorProvider } from '../live/relogioServidor';
import { TELAS, type TelaId } from '../live/tipos';
import { Topo } from '../painel/Topo';
import { ListaTelas } from '../painel/ListaTelas';
import { Previa } from '../painel/Previa';
import { CampoTexto } from '../painel/CampoTexto';
import '../painel/painel.css';

export function PainelPage() {
  return (
    <RelogioServidorProvider>
      <Painel />
    </RelogioServidorProvider>
  );
}

function Painel() {
  const live = useLive();
  const { papel } = useAuth();
  const [tela, setTela] = useState<TelaId>('host');
  const [galeraAberta, setGaleraAberta] = useState(false);
  const { estado, salvarDepois } = live;
  const label = TELAS.find((t) => t.id === tela)!.label;

  return (
    <div className="p-painel">
      <Topo status={live.status} editadoPor={live.editadoPor} editadoEm={live.editadoEm} ehAdmin={papel === 'admin'} aoAbrirGalera={() => setGaleraAberta(true)} />
      <div className="p-grade">
        <ListaTelas atual={tela} aoEscolher={setTela} />
        <main className="p-centro">
          <div className="p-previa-cabeca">
            <div className="p-previa-titulo">{label}</div>
            <div className="p-previa-aviso">PRÉVIA · NÃO É O QUE ESTÁ NO AR</div>
          </div>
          <Previa tela={tela} estado={estado} />
          <section className="p-infos">
            <div className="p-infos-cabeca">
              <div className="p-selo">INFOS DA TELA</div>
              <div className="p-infos-sub">ATUALIZA NO OBS NA HORA</div>
            </div>
            {/* Task 11: <CamposTela tela={tela} live={live} /> */}
            <div className="p-divisor" />
            <CampoTexto rotulo="TÍTULO DA LIVE · TODAS AS CENAS" valor={estado.titulo} maiusculo aoMudar={(v) => salvarDepois({ titulo: v })} />
            <CampoTexto rotulo="LETREIRO · SEPARA COM ●" valor={estado.ticker} maiusculo aoMudar={(v) => salvarDepois({ ticker: v })} />
          </section>
        </main>
        {/* Task 12: <aside className="p-direita"><ColunaPix …/><CaixaChat/></aside> */}
      </div>
      {/* Task 13: {galeraAberta && <ModalGalera …/>} */}
    </div>
  );
}
```

(O `setGaleraAberta` fica sem leitor até a Task 13; se o lint reclamar, deixar `galeraAberta` sendo usado na Task 13 — é a mesma sequência de commits.)

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/painel src/pages && npx tsc -b`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/painel src/pages/PainelPage.tsx src/pages/PainelPage.test.tsx src/live/formatar.ts src/live/formatar.test.ts
git commit -m "feat(painel): estrutura nova com topo, telas, prévia real e título/letreiro"
```

---

### Task 11: Painel — campos por tela, câmera com galera, jogo OUTRO, enquete

**Files:**
- Create: `src/painel/CampoCamera.tsx`, `src/painel/CamposTela.tsx`
- Modify: `src/pages/PainelPage.tsx`, `src/painel/painel.css`
- Test: `src/painel/CampoCamera.test.tsx`, `src/painel/CamposTela.test.tsx`

**Interfaces:**
- Consumes: `useLive` (retorno inteiro como prop `live`), `CampoTexto`, `JOGO_OPCOES`, `mmss`, `segundosJogo`, `useAgora`, `Pessoa`.
- Produces:
  - `<CampoCamera numero: number; valor: string; galera: Pessoa[]; aoMudar(v: string): void />`
  - `<CamposTela tela: TelaId; live: ReturnType<typeof useLive> />`

Markup: portar `Painel US.dc.html` linhas 68–163 (seções de cada tela), classes `p-*`. Mapeamento:

| Seção | Gravação |
|---|---|
| Futebol: nomes dos times | `salvarDepois({ timeA })` / `timeB`, maiúsculo |
| gols − / + | `salvar({ golsA: max(0, golsA-1) })` / `+1` |
| relógio: texto `mmss(segundosJogo(estado, useAgora(500)))`; ▶ INICIAR / ❚❚ PAUSAR / ZERAR | `live.relogio('iniciar'|'pausar'|'zerar')`; botão alterna rótulo por `estado.clockRodando` |
| jogo: 5 botões (`JOGO_OPCOES`) | `salvar({ jogo })`; com `OUTRO` aparece `CampoTexto` → `salvarDepois({ jogoOutro })` |
| enquete: 3 campos numéricos (rótulos `timeA`, `EMPATE`, `timeB`) + chave MOSTRAR/ESCONDER | `salvarDepois({ enquete: { ...estado.enquete, casa: clamp(0,100,int) } })`; chave `salvar({ enquete: { ...estado.enquete, mostrar: !mostrar } })` |
| Câmeras (host, mesa, futebol, filme; host tem opções 1/2/3) | quantidade: mesa 6, filme 4, futebol 2, host `Number(hostCams)`; `salvarDepois({ nomes: nomes.map((n,j)=> j===i ? v : n) })`; opções `salvar({ hostCams })` |
| Host: PIX LINK | `salvarDepois({ pixLink })` maiúsculo |
| Filme | `filme`, `episodio` (salvarDepois, maiúsculo) |
| Início/Intervalo: minutos 2/5/10/15/30, ↻ REINICIAR; Intervalo: FRASE NA TELA | `salvar({ minutos })` (o banco reinicia a contagem); `live.reiniciarContagem()`; `salvarDepois({ msg })` |
| Lower: QUEM TÁ FALANDO (botões com `galera`; selecionado = `ltNome === p.nome`), campo NOME livre, FUNÇÃO / LEGENDA | botão: `salvar({ ltNome: p.nome, funcao: p.funcao })`; campos: `salvarDepois({ ltNome })` / `({ funcao })`. Galera vazia: texto "Cadastra a galera no botão GALERA lá em cima." |
| Fim: PRÓXIMA LIVE | `salvarDepois({ proximo })` |
| Técnico | texto "Essa tela não tem infos pra editar." |

Atenção ao salvar `nomes` e `enquete` (valores objeto/array) com `salvarDepois`: a chave pendente é o campo inteiro; digitar em duas câmeras em menos de 400 ms manda só o último array, que já contém as duas mudanças, porque `estado.nomes` vem do estado com pendentes aplicados. O teste abaixo cobre isso.

- [ ] **Step 1: Testes que falham**

`src/painel/CampoCamera.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CampoCamera } from './CampoCamera';

const galera = [
  { id: '1', nome: 'ANA', funcao: 'HOST' },
  { id: '2', nome: 'ANDERSON', funcao: 'CAMERA' },
  { id: '3', nome: 'BIA', funcao: 'CONVIDADA' },
];

describe('CampoCamera', () => {
  it('filtra a galera enquanto digita e escolhe com clique', () => {
    const aoMudar = vi.fn();
    render(<CampoCamera numero={1} valor="" galera={galera} aoMudar={aoMudar} />);
    const input = screen.getByLabelText('CÂMERA 01');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'an' } });
    expect(screen.getByRole('option', { name: 'ANA' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'ANDERSON' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'BIA' })).toBeNull();
    fireEvent.mouseDown(screen.getByRole('option', { name: 'ANDERSON' }));
    expect(aoMudar).toHaveBeenLastCalledWith('ANDERSON');
  });

  it('aceita nome livre e escolhe com teclado', () => {
    const aoMudar = vi.fn();
    render(<CampoCamera numero={2} valor="" galera={galera} aoMudar={aoMudar} />);
    const input = screen.getByLabelText('CÂMERA 02');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'convidado x' } });
    expect(aoMudar).toHaveBeenLastCalledWith('CONVIDADO X');
    fireEvent.change(input, { target: { value: 'b' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(aoMudar).toHaveBeenLastCalledWith('BIA');
  });
});
```

`src/painel/CamposTela.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ESTADO_PADRAO } from '../live/tipos';

vi.mock('../live/relogioServidor', () => ({ useAgora: () => 0 }));
import { CamposTela } from './CamposTela';

function live(extra = {}) {
  return { estado: { ...ESTADO_PADRAO, galera: [{ id: '1', nome: 'ANA', funcao: 'HOST' }], ...extra }, status: 'ao_vivo', editadoPor: null, editadoEm: null, salvar: vi.fn(), salvarDepois: vi.fn(), reiniciarContagem: vi.fn(), relogio: vi.fn() } as never;
}

describe('CamposTela', () => {
  it('futebol: gol, relógio, OUTRO e enquete', () => {
    const l = live({ golsA: 1 });
    render(<CamposTela tela="futebol" live={l} />);
    fireEvent.click(screen.getAllByText('+')[0]);
    expect((l as { salvar: ReturnType<typeof vi.fn> }).salvar).toHaveBeenCalledWith({ golsA: 2 });
    fireEvent.click(screen.getByText('▶ INICIAR'));
    expect((l as { relogio: ReturnType<typeof vi.fn> }).relogio).toHaveBeenCalledWith('iniciar');
    fireEvent.click(screen.getByText('OUTRO'));
    expect((l as { salvar: ReturnType<typeof vi.fn> }).salvar).toHaveBeenCalledWith({ jogo: 'OUTRO' });
    fireEvent.click(screen.getByText('MOSTRAR'));
    expect((l as { salvar: ReturnType<typeof vi.fn> }).salvar).toHaveBeenCalledWith({ enquete: { casa: 0, empate: 0, fora: 0, mostrar: true } });
  });

  it('lower: escolher alguém da galera preenche nome e função', () => {
    const l = live();
    render(<CamposTela tela="lower" live={l} />);
    fireEvent.click(screen.getByRole('button', { name: 'ANA' }));
    expect((l as { salvar: ReturnType<typeof vi.fn> }).salvar).toHaveBeenCalledWith({ ltNome: 'ANA', funcao: 'HOST' });
  });

  it('câmera grava o array inteiro de nomes', () => {
    const l = live({ hostCams: '2' });
    render(<CamposTela tela="host" live={l} />);
    const cam2 = screen.getByLabelText('CÂMERA 02');
    fireEvent.focus(cam2);
    fireEvent.change(cam2, { target: { value: 'zé' } });
    expect((l as { salvarDepois: ReturnType<typeof vi.fn> }).salvarDepois).toHaveBeenLastCalledWith({ nomes: ['NOME 01', 'ZÉ', 'NOME 03', 'NOME 04', 'NOME 05', 'NOME 06'] });
  });

  it('início: minutos e reiniciar', () => {
    const l = live();
    render(<CamposTela tela="inicio" live={l} />);
    fireEvent.click(screen.getByText('10 MIN'));
    expect((l as { salvar: ReturnType<typeof vi.fn> }).salvar).toHaveBeenCalledWith({ minutos: 10 });
    fireEvent.click(screen.getByText('↻ REINICIAR'));
    expect((l as { reiniciarContagem: ReturnType<typeof vi.fn> }).reiniciarContagem).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/painel`
Expected: FAIL.

- [ ] **Step 3: Implementar**

`src/painel/CampoCamera.tsx`:

```tsx
import { useEffect, useId, useState } from 'react';
import type { Pessoa } from '../live/tipos';

interface Props { numero: number; valor: string; galera: Pessoa[]; aoMudar: (v: string) => void }

export function CampoCamera({ numero, valor, galera, aoMudar }: Props) {
  const id = useId();
  const rotulo = `CÂMERA ${String(numero).padStart(2, '0')}`;
  const [local, setLocal] = useState(valor);
  const [aberto, setAberto] = useState(false);
  const [destaque, setDestaque] = useState(-1);
  useEffect(() => {
    if (!aberto) setLocal(valor);
  }, [valor, aberto]);

  const termo = local.trim().toUpperCase();
  const opcoes = galera.filter((p) => !termo || p.nome.toUpperCase().includes(termo)).slice(0, 8);

  function escolher(nome: string) {
    setLocal(nome);
    aoMudar(nome);
    setAberto(false);
    setDestaque(-1);
  }

  return (
    <div className="p-campo p-camera">
      <label htmlFor={id} className="p-rotulo">{rotulo}</label>
      <input
        id={id}
        className="p-input"
        role="combobox"
        aria-expanded={aberto}
        aria-controls={`${id}-lista`}
        value={local}
        onFocus={() => setAberto(true)}
        onBlur={() => setAberto(false)}
        onChange={(e) => {
          const v = e.target.value.toUpperCase();
          setLocal(v);
          aoMudar(v);
          setAberto(true);
          setDestaque(-1);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setDestaque((d) => Math.min(opcoes.length - 1, d + 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setDestaque((d) => Math.max(0, d - 1)); }
          else if (e.key === 'Enter' && destaque >= 0 && opcoes[destaque]) { e.preventDefault(); escolher(opcoes[destaque].nome); }
          else if (e.key === 'Escape') setAberto(false);
        }}
      />
      {aberto && opcoes.length > 0 && (
        <ul id={`${id}-lista`} role="listbox" className="p-camera__lista">
          {opcoes.map((p, i) => (
            <li
              key={p.id}
              role="option"
              aria-selected={i === destaque}
              aria-label={p.nome}
              className={i === destaque ? 'p-camera__opcao p-camera__opcao--ativa' : 'p-camera__opcao'}
              onMouseDown={(e) => { e.preventDefault(); escolher(p.nome); }}
            >
              <span>{p.nome}</span>
              <span className="p-camera__funcao">{p.funcao}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

CSS: lista absoluta abaixo do input, `background #120e10`, `box-shadow inset 0 0 0 2px #3a3035, 6px 6px 0 #8B6CF0`, opção ativa `#FF6B1F` com texto `#1A1417`, fonte `700 18px 'Barlow Condensed'`, função em `JetBrains Mono` 11px `#8a7f84`.

`src/painel/CamposTela.tsx`: um componente com `switch (tela)` montando as seções da tabela acima, portando o markup das linhas 68–163. Botões de opção seguem o `sel()` da referência (linha 272): ativo `bg #FF6B1F`/`#8B6CF0` (tempos do jogo), `fg #1A1417`; inativo `#241d21`/`#FFF3E0`. Enquete: três `CampoTexto tipo="number"` com `aoMudar={(v) => salvarDepois({ enquete: { ...estado.enquete, casa: limitar(v) } })}` onde `limitar = (v) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)))`, e botão `MOSTRAR`/`ESCONDER` conforme `enquete.mostrar`.

`src/pages/PainelPage.tsx`: trocar o comentário da Task 11 por `<CamposTela tela={tela} live={live} />`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/painel src/pages && npx tsc -b`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/painel src/pages/PainelPage.tsx
git commit -m "feat(painel): campos por tela, câmera com a galera, jogo OUTRO e enquete"
```

---

### Task 12: Painel — coluna PIX e caixa do chat

**Files:**
- Create: `src/painel/ColunaPix.tsx`, `src/painel/CaixaChat.tsx`
- Modify: `src/pages/PainelPage.tsx`, `src/painel/painel.css`
- Test: `src/painel/ColunaPix.test.tsx`

**Interfaces:**
- Consumes: `usePix`, `live` (`estado.metaAtual/metaTotal/metaDesc/ajuste`, `salvarDepois`), `reais`, `CampoTexto`.
- Produces: `<ColunaPix live pix: ReturnType<typeof usePix> />`, `<CaixaChat />`.

Markup: portar `Painel US.dc.html` linhas 174–209 (PIX) e 210–216 (cabeçalho do CHAT). Selo do cabeçalho do PIX: "MANUAL · LIVEPIX EM BREVE" no lugar de "AUTO · LIVEPIX". Lista: `x.nome`, origem `LIVEPIX`/`MANUAL`, `x.msg || '—'`, `R$ {reais(x.valor)}`, botão `×` (title "Não contar (estorno/teste)") ou `↺` (title "Voltar a contar") → `pix.alternar(x.id)`; `off` → `opacity .4` e `line-through`. Meta: `pct = min(100, round(metaAtual/max(1,metaTotal)*100))`. Campos: OBJETIVO (`salvarDepois({ metaDesc })`, maiúsculo), META R$ (`salvarDepois({ metaTotal: Math.max(1, Number(v) || 1) })`), AJUSTE R$ (`salvarDepois({ ajuste: Number(v.replace(',', '.')) || 0 })`). PIX manual: NOME, R$, `+ ADD` → valida (nome não vazio, valor > 0 aceitando vírgula) e chama `pix.adicionarManual(nome, valor)`; erro aparece em linha creme como o erro do login; sucesso limpa os campos. Enter no campo R$ também adiciona.

`CaixaChat`: cabeçalho "CHAT" + botões YT/TW/TT desabilitados, corpo com "O CHAT CHEGA NA PARTE 3" centralizado em `#4a3f44`.

- [ ] **Step 1: Teste que falha**

`src/painel/ColunaPix.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ESTADO_PADRAO } from '../live/tipos';
import { ColunaPix } from './ColunaPix';

const lista = [
  { id: 'a', nome: 'TIAGÃO', valor: 25.5, msg: 'pra pizza', origem: 'manual', externo_id: null, off: false, created_at: '' },
  { id: 'b', nome: 'CAROL', valor: 10, msg: '', origem: 'livepix', externo_id: 'x', off: true, created_at: '' },
];

function montar() {
  const live = { estado: { ...ESTADO_PADRAO, metaAtual: 250, metaTotal: 500 }, salvarDepois: vi.fn() } as never;
  const pix = { lista, adicionarManual: vi.fn().mockResolvedValue(null), alternar: vi.fn() } as never;
  render(<ColunaPix live={live} pix={pix} />);
  return { live: live as { salvarDepois: ReturnType<typeof vi.fn> }, pix: pix as { adicionarManual: ReturnType<typeof vi.fn>; alternar: ReturnType<typeof vi.fn> } };
}

describe('ColunaPix', () => {
  it('mostra meta, lista com origem e alterna contar/não contar', () => {
    const { pix } = montar();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('R$ 25,50')).toBeInTheDocument();
    expect(screen.getByText('MANUAL')).toBeInTheDocument();
    expect(screen.getByText('LIVEPIX')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Voltar a contar'));
    expect(pix.alternar).toHaveBeenCalledWith('b');
  });

  it('PIX manual aceita vírgula e limpa depois', async () => {
    const { pix } = montar();
    fireEvent.change(screen.getByPlaceholderText('NOME (PIX MANUAL)'), { target: { value: 'duda' } });
    fireEvent.change(screen.getByPlaceholderText('R$'), { target: { value: '7,5' } });
    fireEvent.click(screen.getByText('+ ADD'));
    await waitFor(() => expect(pix.adicionarManual).toHaveBeenCalledWith('DUDA', 7.5));
    await waitFor(() => expect((screen.getByPlaceholderText('R$') as HTMLInputElement).value).toBe(''));
  });

  it('PIX manual sem valor não chama o banco e avisa', () => {
    const { pix } = montar();
    fireEvent.change(screen.getByPlaceholderText('NOME (PIX MANUAL)'), { target: { value: 'duda' } });
    fireEvent.click(screen.getByText('+ ADD'));
    expect(pix.adicionarManual).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('ajuste com vírgula grava número', () => {
    const { live } = montar();
    fireEvent.change(screen.getByLabelText('AJUSTE R$'), { target: { value: '-5,5' } });
    expect(live.salvarDepois).toHaveBeenLastCalledWith({ ajuste: -5.5 });
  });
});
```

(O campo de valor do PIX manual é `type="text" inputMode="decimal"` para aceitar vírgula; META e AJUSTE também, pelo mesmo motivo. Só o valor do PIX manual tem `placeholder="R$"`; META R$ e AJUSTE R$ usam `rotulo`, sem placeholder, pra não confundir o teste nem quem usa.)

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/painel/ColunaPix.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar** `ColunaPix` e `CaixaChat` conforme descrito; em `PainelPage` adicionar `const pix = usePix();` e `<aside className="p-direita"><ColunaPix live={live} pix={pix} /><CaixaChat /></aside>`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/painel src/pages && npx tsc -b`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/painel src/pages/PainelPage.tsx
git commit -m "feat(painel): coluna de PIX com meta, ajuste, não contar e PIX manual"
```

---

### Task 13: Painel — modal GALERA

**Files:**
- Create: `src/painel/ModalGalera.tsx`
- Modify: `src/pages/PainelPage.tsx`, `src/painel/painel.css`
- Test: `src/painel/ModalGalera.test.tsx`

**Interfaces:**
- Consumes: `Pessoa`, `CampoTexto`.
- Produces: `<ModalGalera galera: Pessoa[]; aoSalvar(g: Pessoa[]): void; aoFechar(): void />` — cada mudança chama `aoSalvar` com a lista inteira; o painel liga em `(g) => live.salvarDepois({ galera: g })`.

Visual: fundo `rgba(26,20,23,.72)`, cartão `#1A1417` com listra laranja no topo (mesmo padrão do modal "ESQUECI A SENHA" do login, `src/styles/login.css`), título "GALERA" em Bungee, contador `N/20`, linhas `[NOME][FUNÇÃO][×]`, botão "+ ADICIONAR" (desabilitado com 20, texto "LIMITE DE 20"), "FECHAR". Esc ou clique fora fecha. Novo item: `{ id: crypto.randomUUID(), nome: '', funcao: '' }`.

- [ ] **Step 1: Teste que falha**

`src/painel/ModalGalera.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ModalGalera } from './ModalGalera';

describe('ModalGalera', () => {
  it('adiciona, edita em maiúsculas e remove', () => {
    const aoSalvar = vi.fn();
    const { rerender } = render(<ModalGalera galera={[]} aoSalvar={aoSalvar} aoFechar={() => {}} />);
    fireEvent.click(screen.getByText('+ ADICIONAR'));
    const nova = aoSalvar.mock.calls[0][0];
    expect(nova).toHaveLength(1);
    rerender(<ModalGalera galera={nova} aoSalvar={aoSalvar} aoFechar={() => {}} />);
    fireEvent.change(screen.getByLabelText('NOME 1'), { target: { value: 'ana' } });
    expect(aoSalvar).toHaveBeenLastCalledWith([{ ...nova[0], nome: 'ANA' }]);
    fireEvent.click(screen.getByTitle('Remover'));
    expect(aoSalvar).toHaveBeenLastCalledWith([]);
  });

  it('trava em 20', () => {
    const g = Array.from({ length: 20 }, (_, i) => ({ id: String(i), nome: `P${i}`, funcao: '' }));
    render(<ModalGalera galera={g} aoSalvar={vi.fn()} aoFechar={() => {}} />);
    expect(screen.getByText('LIMITE DE 20')).toBeDisabled();
    expect(screen.getByText('20/20')).toBeInTheDocument();
  });

  it('Esc fecha', () => {
    const aoFechar = vi.fn();
    render(<ModalGalera galera={[]} aoSalvar={vi.fn()} aoFechar={aoFechar} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(aoFechar).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/painel/ModalGalera.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar**

```tsx
import { useEffect } from 'react';
import type { Pessoa } from '../live/tipos';
import { CampoTexto } from './CampoTexto';

const MAX = 20;

interface Props { galera: Pessoa[]; aoSalvar: (g: Pessoa[]) => void; aoFechar: () => void }

export function ModalGalera({ galera, aoSalvar, aoFechar }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aoFechar]);

  const mudar = (id: string, campo: 'nome' | 'funcao', v: string) =>
    aoSalvar(galera.map((p) => (p.id === id ? { ...p, [campo]: v } : p)));
  const cheia = galera.length >= MAX;

  return (
    <div className="p-modal-fundo" onClick={aoFechar}>
      <div className="p-modal" role="dialog" aria-label="GALERA" onClick={(e) => e.stopPropagation()}>
        <div className="p-modal__listra" />
        <div className="p-modal__cabeca">
          <div className="p-modal__titulo">GALERA</div>
          <div className="p-modal__contador">{galera.length}/{MAX}</div>
        </div>
        <div className="p-modal__lista">
          {galera.map((p, i) => (
            <div key={p.id} className="p-modal__linha">
              <CampoTexto rotulo={`NOME ${i + 1}`} valor={p.nome} maiusculo aoMudar={(v) => mudar(p.id, 'nome', v)} />
              <CampoTexto rotulo={`FUNÇÃO ${i + 1}`} valor={p.funcao} maiusculo aoMudar={(v) => mudar(p.id, 'funcao', v)} />
              <button type="button" className="p-botao-icone" title="Remover" onClick={() => aoSalvar(galera.filter((x) => x.id !== p.id))}>×</button>
            </div>
          ))}
          {galera.length === 0 && <div className="p-vazio">Ninguém cadastrado ainda.</div>}
        </div>
        <div className="p-modal__rodape">
          <button
            type="button"
            className="p-botao"
            disabled={cheia}
            onClick={() => aoSalvar([...galera, { id: crypto.randomUUID(), nome: '', funcao: '' }])}
          >
            {cheia ? 'LIMITE DE 20' : '+ ADICIONAR'}
          </button>
          <button type="button" className="p-botao p-botao--escuro" onClick={aoFechar}>FECHAR</button>
        </div>
      </div>
    </div>
  );
}
```

Em `PainelPage`: `{galeraAberta && <ModalGalera galera={estado.galera} aoSalvar={(g) => salvarDepois({ galera: g })} aoFechar={() => setGaleraAberta(false)} />}`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run && npx tsc -b`
Expected: todos PASS.

- [ ] **Step 5: Conferir o painel no navegador (fixture não cobre o painel; usar o Supabase local de teste não existe — conferir contra o Supabase real só na Task 14)**. Aqui, conferir layout com `npm run dev` logado: a página carrega, as 9 telas trocam a prévia, a prévia escala ao redimensionar, no celular (390 px) empilha sem rolagem horizontal. Tirar print desktop e 390 px com o script de playwright para `docs/prints/painel-*.png`.

- [ ] **Step 6: Commit**

```bash
git add src/painel src/pages/PainelPage.tsx docs/prints/painel-*.png
git commit -m "feat(painel): cadastro da galera (até 20) em modal"
```

---

### Task 14: Limpeza, README, migration em produção e entrega

**Files:**
- Delete: `src/components/overlay/`, `src/components/painel/`, `src/pages/OverlayPage.tsx`, `src/pages/OverlayPage.test.tsx`, `src/pages/PreviewPage.tsx`, `src/hooks/useSala.ts`, `src/hooks/useSala.test.ts`, `src/hooks/useEventos.ts`, `src/hooks/useEventos.test.ts`, `src/hooks/useServerClock.ts`, `src/hooks/useServerClock.test.ts`, `src/lib/tempo.ts`, `src/lib/tempo.test.ts`, `src/types/estado.ts`, `src/styles/overlays.css`
- Modify: `src/App.tsx`, `src/main.tsx` (remove import de `overlays.css`), `src/styles/identidade.css` (remove classes `.painel*`, `.indicador-status*`, `.login-form*` que ficaram sem uso), `README.md`, `CLAUDE.md`

- [ ] **Step 1: Apagar o antigo e ajustar rotas**

`src/App.tsx` final:

```tsx
<Routes>
  <Route path="/tela/:id" element={<TelaPage />} />
  <Route path="/alerta" element={<AlertaPage />} />
  <Route path="/login" element={<LoginPage />} />
  <Route path="/painel" element={<RotaProtegida><PainelPage /></RotaProtegida>} />
  <Route path="/admin" element={<RotaProtegida><AdminPage /></RotaProtegida>} />
  <Route path="*" element={<Navigate to="/painel" replace />} />
</Routes>
```

Run: `npx tsc -b && npx vitest run && npm run build`
Expected: sem erros; `grep -rn "useSala\|useEventos\|types/estado\|overlay/" src` vazio.

- [ ] **Step 2: README**

Seção "Configurar no OBS" reescrita:
- Uma fonte **Navegador** por tela: `https://SEU-DOMINIO/tela/inicio` (e `host`, `futebol`, `filme`, `mesa`, `intervalo`, `lower`, `tecnico`, `fim`), 1920×1080, "Atualizar navegador quando a cena ficar ativa" **desmarcado** (o estado chega sozinho).
- Câmeras, chat e QR code entram como fontes **acima** da tela, encaixadas nas caixas (tamanhos na tabela: Host 1 câm 924×520 em 60,150 + QR 214×214; 2 câm 635×520; 3 câm 780×520 + 2× 490×235; Futebol 2× 645×400; Filme 4× 645×340; Mesa 6× 580×326; chat 440×800 Host, 440×910 Futebol, 440×750 Filme).
- `/alerta` como fonte separada, 1920×1080, na cena de cima de tudo (ou em todas as cenas); som opcional colocando `public/alerta.mp3` e ajustando o volume no mixer do OBS.
- Troca de cena com transição Fita (stinger) e Modo Estúdio; o painel não troca cena.
- Passo de banco: rodar `0005_telas_novas.sql` no SQL Editor (apaga o estado antigo).

- [ ] **Step 3: Aplicar a migration no Supabase**

Perguntar ao usuário antes (é produção e apaga o estado antigo). Com o OK: ele roda `supabase/migrations/0005_telas_novas.sql` no SQL Editor, ou autoriza rodar pelo pooler (`aws-0-us-east-1.pooler.supabase.com:5432`, usuário `postgres.yupmxwirknqrdssyievb`) com a senha do banco que ele informar na hora. Depois conferir via API com a publishable key: `GET /rest/v1/pix?select=id&limit=1` → 200; `GET /rest/v1/salas?select=estado` → contém `enquete` e `chatPin`.

- [ ] **Step 4: Verificação de ponta a ponta (navegador real, playwright-core)**

Com `npm run dev` e login do admin (`unidadesecretarp@gmail.com`, senha informada pelo usuário na hora; não gravar em arquivo):
1. Abrir `/tela/host` numa aba e `/painel` em outra; mudar o título no painel → aparece na tela em < 1 s.
2. Adicionar PIX manual de R$ 7,50 → meta, último e top mudam no Host; `/alerta` mostra o cartão.
3. Marcar "não contar" → meta volta.
4. Iniciar o relógio do futebol, recarregar `/tela/futebol` → mesmo minuto.
5. Reiniciar contagem com 2 MIN → `/tela/inicio` e `/tela/intervalo` mostram o mesmo tempo.
Registrar os resultados no resumo final. Apagar os PIX de teste depois (`delete from pix where origem='manual' and nome like 'TESTE%'` pelo SQL Editor; usar nomes começando com TESTE).

- [ ] **Step 5: Atualizar `CLAUDE.md`** (seção "Onde paramos": parte 1 entregue, próximos: parte 2 LivePix, parte 3 chat).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove telas e painel antigos, README das telas novas"
```

- [ ] **Step 7: Entrega ao usuário**

Mandar: lista das URLs (`/tela/*` ×9, `/alerta`, `/painel`, `/admin`, `/login`), o print `docs/prints/alerta.png` e os 9 `docs/prints/*-lado-a-lado.png`, e as duas decisões visuais a confirmar (placeholders escondidos no OBS; visual do alerta).
