# Unidade Secreta Live — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `unidade-secreta-live`, a mobile-first web panel that lets any of ~14 friends update OBS overlay state (title, timer, score, who's on screen, lower-third names, donation alerts) from anywhere, syncing in real time to whoever's OBS is currently streaming, at zero hosting cost.

**Architecture:** Vite + React + TypeScript SPA, React Router for `/overlay/:cena`, `/painel`, `/preview`, `/admin`, `/login`. Supabase Postgres holds a single `salas` row per broadcast room (`estado jsonb`), synced to all clients via Supabase Realtime (`postgres_changes`). Writes go through a `SECURITY DEFINER` RPC (`atualizar_estado`) that merges a JSON patch server-side, so two editors never clobber each other and no `service_role` key is ever shipped to the client. Auth is Supabase magic-link; membership/roles live in `membros_equipe` keyed by email, bound to `auth.users.id` on first login via a trigger — no Admin API / edge function needed, so the whole thing is static and deployable to Vercel's free tier. A server-clock offset (via RPC `hora_servidor`) keeps countdowns and the lower-third timer in sync across devices with different local clocks.

**Tech Stack:** Vite, React 18, TypeScript, React Router v6, `@supabase/supabase-js`, Vitest + @testing-library/react for tests, plain CSS (no UI framework), Vercel for hosting, Supabase free tier (Postgres + Auth + Realtime).

**Spec:** `PROMPT-CLAUDE-CODE.md` (repo root) — original Portuguese requirements. Visual/animation reference: `referencia/OBS-Cenas.dc.html`, `referencia/OBS-Painel.dc.html`.

## Global Constraints

- 100% free: no paid hosting, no paid Supabase tier, no server process to maintain (static SPA only).
- Colors: laranja `#FF6B1F`, tinta `#1A1417`, creme `#FFF3E0`, violeta `#8B6CF0`. Fonts: `Barlow Condensed` (500/600/700), `JetBrains Mono` (400/700), `Bungee` (400) — via Google Fonts.
- Overlay routes (`/overlay/:cena`) must be public (no login) and render on transparent background at fixed 1920×1080, since they're loaded as OBS Browser Sources.
- Data model shape is fixed (must port 1:1): `{titulo, minutos, fim, msg, proximo, timeA, timeB, golsA, golsB, jogo, membros[10]{n,f}, noAr[], cams[3], lt, ltAte, ltSeg}`.
- Countdown / lower-third timing must use server time (via `hora_servidor` RPC), not raw `Date.now()`, so devices don't desync.
- Overlays must never flash back to default/mock state on reconnect — always hydrate from a local cache first, then reconcile.
- All UI copy is in Portuguese (Brazil), matching the reference tone (caixa alta nos rótulos).
- Buttons in `/painel` ≥44px touch target; optimistic updates (UI reacts before the network round-trip completes).
- Small, frequent commits — one per task in this plan.
- Language for all commit messages, comments (when unavoidable), and UI copy: Portuguese. This plan document itself is in English for the executing agent, but everything it produces is in Portuguese.

---

## File Structure

```
unidade-secreta-live (repo root)
├── index.html
├── package.json / vite.config.ts / tsconfig*.json / vitest config (in vite.config.ts)
├── .env.example / .gitignore / README.md
├── supabase/migrations/
│   ├── 0001_schema.sql        # tables + RLS policies + seed row
│   ├── 0002_funcoes.sql       # hora_servidor, atualizar_estado, disparar_evento, vínculo trigger
│   └── 0003_realtime.sql      # add salas/eventos to supabase_realtime publication
└── src/
    ├── main.tsx / App.tsx (router)
    ├── lib/
    │   ├── supabase.ts        # supabase client singleton
    │   └── tempo.ts           # pure helpers: formatRelogio, calcularRestante, formatarTempoRelativo
    ├── types/estado.ts        # Estado, Membro, Cena, EventoAlerta types + ESTADO_PADRAO
    ├── hooks/
    │   ├── useServerClock.ts  # server-synced "now"
    │   ├── useSala.ts         # fetch + realtime subscribe + optimistic patch for one sala
    │   └── useAuth.ts         # session + papel (admin/editor) lookup
    ├── styles/
    │   ├── identidade.css     # tokens, fonts, resets
    │   └── overlays.css       # all overlay scene CSS + @keyframes
    ├── components/
    │   ├── RotaProtegida.tsx
    │   ├── overlay/
    │   │   ├── Dots.tsx
    │   │   ├── Comecando.tsx / Intervalo.tsx / Encerramento.tsx
    │   │   ├── Jogo.tsx / ReactCameras.tsx / Nome.tsx / Alerta.tsx
    │   └── painel/
    │       ├── IndicadorStatus.tsx
    │       ├── SecaoComecando.tsx / SecaoIntervalo.tsx / SecaoEncerramento.tsx
    │       ├── SecaoPlacar.tsx / SecaoCameras.tsx / SecaoMembros.tsx
    │       └── SecaoAlerta.tsx
    └── pages/
        ├── OverlayPage.tsx / LoginPage.tsx / PainelPage.tsx / PreviewPage.tsx / AdminPage.tsx
```

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `.gitignore`, `.env.example`, `README.md`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`

**Interfaces:**
- Produces: a runnable Vite dev server (`npm run dev`) and a working Vitest runner (`npm run test`), which every later task depends on.

- [ ] **Step 1: Scaffold with Vite**

```bash
npm create vite@latest . -- --template react-ts
```

Accept overwriting only if prompted about the (currently empty except `referencia/` and this plan) directory — do not touch `referencia/` or `docs/`.

- [ ] **Step 2: Install runtime + test dependencies**

```bash
npm install @supabase/supabase-js react-router-dom
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitest/coverage-v8
```

- [ ] **Step 3: Configure Vitest in `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
  },
});
```

Create `src/setupTests.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

Add to `package.json` `scripts`: `"test": "vitest run"`.

- [ ] **Step 4: `.env.example`**

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

- [ ] **Step 5: `.gitignore`** — ensure it includes `node_modules`, `dist`, `.env`, `.env.local`.

- [ ] **Step 6: `index.html`** — set title and load fonts:

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Unidade Secreta Live</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Bungee&family=JetBrains+Mono:wght@400;700&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: `src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/identidade.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
```

(`./styles/identidade.css` doesn't exist yet — created in Task 7. Leave the import; the dev server will error until then, which is fine since the next steps run before `npm run dev`.)

- [ ] **Step 8: `src/App.tsx`** placeholder (routes wired progressively in later tasks)

```tsx
export default function App() {
  return <div>Unidade Secreta Live</div>;
}
```

- [ ] **Step 9: `README.md`** — start with:

```md
# Unidade Secreta Live

Painel web para controlar os overlays de OBS da Unidade Secreta em tempo real, de qualquer lugar.

## Desenvolvimento

\`\`\`bash
npm install
cp .env.example .env.local # preencha com as chaves do seu projeto Supabase
npm run dev
\`\`\`

## Testes

\`\`\`bash
npm run test
\`\`\`
```

- [ ] **Step 10: Verify test runner works** (there are no tests yet, so this should report 0 tests, not error)

Run: `npm run test`
Expected: exits 0, "No test files found" or similar — no crash.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold projeto Vite + React + TS + Vitest"
```

---

### Task 2: Estado types and pure time helpers

**Files:**
- Create: `src/types/estado.ts`, `src/lib/tempo.ts`, `src/lib/tempo.test.ts`

**Interfaces:**
- Produces: `Estado`, `Membro`, `Cena`, `EventoAlerta`, `ESTADO_PADRAO` (used by every hook/component from here on); `formatRelogio(restMs: number): string`, `calcularRestante(estado: Pick<Estado,'fim'|'minutos'>, agoraServidor: number): number`, `formatarTempoRelativo(desdeMs: number, agora: number): string`.

- [ ] **Step 1: `src/types/estado.ts`**

```ts
export interface Membro {
  n: string;
  f: string;
}

export interface Estado {
  titulo: string;
  minutos: number;
  fim: number;
  msg: string;
  proximo: string;
  timeA: string;
  timeB: string;
  golsA: number;
  golsB: number;
  jogo: string;
  membros: Membro[];
  noAr: number[];
  cams: string[];
  lt: number;
  ltAte: number;
  ltSeg: number;
}

export type Cena = 'comecando' | 'intervalo' | 'encerramento' | 'jogo' | 'react' | 'nome' | 'alerta';

export interface EventoAlerta {
  nome: string;
  mensagem: string;
}

export const ESTADO_PADRAO: Estado = {
  titulo: 'RESENHA AO VIVO',
  minutos: 5,
  fim: 0,
  msg: 'VOLTAMOS JÁ',
  proximo: 'SEXTA, 21H',
  timeA: 'CASA',
  timeB: 'FORA',
  golsA: 0,
  golsB: 0,
  jogo: 'AO VIVO',
  membros: Array.from({ length: 10 }, (_, i) => ({
    n: `NOME ${String(i + 1).padStart(2, '0')}`,
    f: 'UNIDADE SECRETA',
  })),
  noAr: [0, 1, 2],
  cams: ['NOME 01', 'NOME 02', 'NOME 03'],
  lt: -1,
  ltAte: 0,
  ltSeg: 6,
};
```

- [ ] **Step 2: Write the failing tests — `src/lib/tempo.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { formatRelogio, calcularRestante, formatarTempoRelativo } from './tempo';

describe('formatRelogio', () => {
  it('formata minutos e segundos com zero à esquerda', () => {
    expect(formatRelogio(65_000)).toBe('01:05');
  });

  it('formata zero como 00:00', () => {
    expect(formatRelogio(0)).toBe('00:00');
  });

  it('trunca frações de segundo', () => {
    expect(formatRelogio(59_999)).toBe('00:59');
  });
});

describe('calcularRestante', () => {
  it('usa minutos configurados quando o cronômetro não foi iniciado (fim=0)', () => {
    expect(calcularRestante({ fim: 0, minutos: 5 }, 1_000_000)).toBe(5 * 60_000);
  });

  it('calcula o tempo restante até "fim" usando o horário do servidor', () => {
    expect(calcularRestante({ fim: 10_000, minutos: 5 }, 4_000)).toBe(6_000);
  });

  it('nunca retorna valor negativo após o fim', () => {
    expect(calcularRestante({ fim: 10_000, minutos: 5 }, 99_000)).toBe(0);
  });
});

describe('formatarTempoRelativo', () => {
  it('mostra segundos para menos de um minuto', () => {
    expect(formatarTempoRelativo(5_000, 10_000)).toBe('há 5s');
  });

  it('mostra minutos a partir de 60s', () => {
    expect(formatarTempoRelativo(0, 90_000)).toBe('há 1min');
  });

  it('mostra "agora" para diferenças menores que 1s', () => {
    expect(formatarTempoRelativo(9_800, 10_000)).toBe('agora');
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npm run test -- src/lib/tempo.test.ts`
Expected: FAIL — `tempo.ts` doesn't exist yet.

- [ ] **Step 4: Implement `src/lib/tempo.ts`**

```ts
import { Estado } from '../types/estado';

export function formatRelogio(restMs: number): string {
  const min = Math.floor(restMs / 60_000);
  const seg = Math.floor(restMs / 1000) % 60;
  return `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;
}

export function calcularRestante(estado: Pick<Estado, 'fim' | 'minutos'>, agoraServidor: number): number {
  if (!estado.fim) return estado.minutos * 60_000;
  return Math.max(0, estado.fim - agoraServidor);
}

export function formatarTempoRelativo(desdeMs: number, agora: number): string {
  const diffMs = agora - desdeMs;
  if (diffMs < 1000) return 'agora';
  const seg = Math.floor(diffMs / 1000);
  if (seg < 60) return `há ${seg}s`;
  const min = Math.floor(seg / 60);
  if (min < 60) return `há ${min}min`;
  const horas = Math.floor(min / 60);
  return `há ${horas}h`;
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npm run test -- src/lib/tempo.test.ts`
Expected: PASS (10 tests)

- [ ] **Step 6: Commit**

```bash
git add src/types/estado.ts src/lib/tempo.ts src/lib/tempo.test.ts
git commit -m "feat: tipos de estado e helpers puros de tempo"
```

---

### Task 3: Database schema, RLS, and seed

**Files:**
- Create: `supabase/migrations/0001_schema.sql`

**Interfaces:**
- Produces: tables `salas(id, slug, nome, estado jsonb, updated_at, updated_by, updated_by_nome)`, `membros_equipe(id, email, user_id, nome, papel, created_at)`, `eventos(id, sala_id, tipo, payload, created_at)`, all with RLS enabled; a seeded row `salas.slug = 'principal'`. Consumed by Task 4's RPCs and every client-side hook.

- [ ] **Step 1: Write `supabase/migrations/0001_schema.sql`**

```sql
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
```

- [ ] **Step 2: Note on testing this task**

There's no local Supabase instance in this repo, so this migration is verified when Task 4's RPCs are exercised against a real (free-tier) Supabase project — deferred to the manual verification in the final guide (Task 17). For now, just check the SQL is syntactically self-consistent by reading it back.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0001_schema.sql
git commit -m "feat: schema inicial (salas, membros_equipe, eventos) com RLS"
```

---

### Task 4: RPC functions and realtime publication

**Files:**
- Create: `supabase/migrations/0002_funcoes.sql`, `supabase/migrations/0003_realtime.sql`

**Interfaces:**
- Produces: `hora_servidor()` (consumed by `useServerClock`), `atualizar_estado(p_slug text, p_patch jsonb)` (consumed by `useSala.atualizar`), `disparar_evento(p_slug text, p_tipo text, p_payload jsonb)` (consumed by `SecaoAlerta`), trigger `vincular_membro_ao_logar` (binds `membros_equipe.user_id` on first login).

- [ ] **Step 1: Write `supabase/migrations/0002_funcoes.sql`**

```sql
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
```

- [ ] **Step 2: Write `supabase/migrations/0003_realtime.sql`**

```sql
alter publication supabase_realtime add table public.salas;
alter publication supabase_realtime add table public.eventos;
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0002_funcoes.sql supabase/migrations/0003_realtime.sql
git commit -m "feat: RPCs (hora_servidor, atualizar_estado, disparar_evento) e realtime"
```

---

### Task 5: Supabase client and `useServerClock`

**Files:**
- Create: `src/lib/supabase.ts`, `src/hooks/useServerClock.ts`, `src/hooks/useServerClock.test.ts`

**Interfaces:**
- Consumes: `supabase.rpc('hora_servidor')` (Task 4).
- Produces: `useServerClock(): number` — current time estimate in ms, corrected by the server offset. Consumed by `useSala` (indirectly via components) and every overlay/painel component that shows a countdown.

- [ ] **Step 1: `src/lib/supabase.ts`**

```ts
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar definidos (veja .env.example)');
}

export const supabase = createClient(url, anonKey);
```

- [ ] **Step 2: Write the failing test — `src/hooks/useServerClock.test.ts`**

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useServerClock } from './useServerClock';

vi.mock('../lib/supabase', () => ({
  supabase: { rpc: vi.fn() },
}));

import { supabase } from '../lib/supabase';

describe('useServerClock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
  });

  it('aplica o offset do servidor sobre o relógio local', async () => {
    // servidor está 10s à frente do cliente
    vi.mocked(supabase.rpc).mockResolvedValue({ data: new Date(1_010_000).toISOString(), error: null } as never);

    const { result } = renderHook(() => useServerClock());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current).toBeGreaterThanOrEqual(1_010_000);
  });

  it('mantém o relógio local se a chamada falhar', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: new Error('falhou') } as never);

    const { result } = renderHook(() => useServerClock());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current).toBeGreaterThanOrEqual(1_000_000);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npm run test -- src/hooks/useServerClock.test.ts`
Expected: FAIL — `useServerClock.ts` doesn't exist.

- [ ] **Step 4: Implement `src/hooks/useServerClock.ts`**

```ts
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const RESSINCRONIZAR_MS = 30_000;
const TICK_MS = 500;

export function useServerClock(): number {
  const [offset, setOffset] = useState(0);
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    let ativo = true;

    async function sincronizar() {
      const antes = Date.now();
      const { data, error } = await supabase.rpc('hora_servidor');
      const depois = Date.now();
      if (!ativo || error || !data) return;
      const latencia = (depois - antes) / 2;
      const servidorAgora = new Date(data as string).getTime() + latencia;
      setOffset(servidorAgora - depois);
    }

    sincronizar();
    const intervaloSync = setInterval(sincronizar, RESSINCRONIZAR_MS);
    const intervaloTick = setInterval(() => setAgora(Date.now()), TICK_MS);

    return () => {
      ativo = false;
      clearInterval(intervaloSync);
      clearInterval(intervaloTick);
    };
  }, []);

  return agora + offset;
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npm run test -- src/hooks/useServerClock.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add src/lib/supabase.ts src/hooks/useServerClock.ts src/hooks/useServerClock.test.ts
git commit -m "feat: cliente supabase e hook de relógio sincronizado com o servidor"
```

---

### Task 6: `useSala` hook (fetch, realtime, cache, optimistic write)

**Files:**
- Create: `src/hooks/useSala.ts`, `src/hooks/useSala.test.ts`

**Interfaces:**
- Consumes: `supabase.from('salas')...`, `supabase.channel(...)`, `supabase.rpc('atualizar_estado', ...)` (Task 4/5); `ESTADO_PADRAO`, `Estado` (Task 2).
- Produces: `useSala(slug: string): { estado: Estado; updatedAt: string | undefined; updatedByNome: string | null | undefined; status: 'conectando' | 'ao_vivo' | 'reconectando'; atualizar: (patch: Partial<Estado>) => Promise<void> }`. Consumed by `OverlayPage` and `PainelPage`.

- [ ] **Step 1: Write the failing test — `src/hooks/useSala.test.ts`**

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSala } from './useSala';
import { ESTADO_PADRAO } from '../types/estado';

function criarCanalFalso() {
  return {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn((cb: (status: string) => void) => {
      cb('SUBSCRIBED');
      return criarCanalFalso();
    }),
  };
}

vi.mock('../lib/supabase', () => {
  const single = vi.fn();
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  const rpc = vi.fn();
  const channel = vi.fn(() => criarCanalFalso());
  const removeChannel = vi.fn();
  return { supabase: { from, select, eq, single, rpc, channel, removeChannel } };
});

import { supabase } from '../lib/supabase';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('useSala', () => {
  it('carrega o estado inicial da sala e marca status ao_vivo', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: 'sala-1', estado: { ...ESTADO_PADRAO, titulo: 'DO BANCO' }, updated_at: '2026-01-01T00:00:00Z', updated_by_nome: 'FULANO' },
      error: null,
    });
    vi.mocked(supabase.from).mockReturnValue({ select: vi.fn(() => ({ eq: vi.fn(() => ({ single })) })) } as never);

    const { result } = renderHook(() => useSala('principal'));

    await waitFor(() => expect(result.current.status).toBe('ao_vivo'));
    expect(result.current.estado.titulo).toBe('DO BANCO');
    expect(result.current.updatedByNome).toBe('FULANO');
  });

  it('aplica patch de forma otimista antes da resposta do RPC', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: 'sala-1', estado: ESTADO_PADRAO, updated_at: '2026-01-01T00:00:00Z', updated_by_nome: null },
      error: null,
    });
    vi.mocked(supabase.from).mockReturnValue({ select: vi.fn(() => ({ eq: vi.fn(() => ({ single })) })) } as never);
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never);

    const { result } = renderHook(() => useSala('principal'));
    await waitFor(() => expect(result.current.status).toBe('ao_vivo'));

    await act(async () => {
      await result.current.atualizar({ titulo: 'NOVO TÍTULO' });
    });

    expect(result.current.estado.titulo).toBe('NOVO TÍTULO');
    expect(supabase.rpc).toHaveBeenCalledWith('atualizar_estado', { p_slug: 'principal', p_patch: { titulo: 'NOVO TÍTULO' } });
  });

  it('usa o cache local como estado inicial antes da resposta de rede', async () => {
    localStorage.setItem(
      'us-obs-cache-principal',
      JSON.stringify({ id: 'sala-1', estado: { ...ESTADO_PADRAO, titulo: 'DO CACHE' }, updatedAt: '2026-01-01T00:00:00Z', updatedByNome: null }),
    );
    const single = vi.fn(() => new Promise(() => {})); // nunca resolve
    vi.mocked(supabase.from).mockReturnValue({ select: vi.fn(() => ({ eq: vi.fn(() => ({ single })) })) } as never);

    const { result } = renderHook(() => useSala('principal'));

    expect(result.current.estado.titulo).toBe('DO CACHE');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- src/hooks/useSala.test.ts`
Expected: FAIL — `useSala.ts` doesn't exist.

- [ ] **Step 3: Implement `src/hooks/useSala.ts`**

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Estado, ESTADO_PADRAO } from '../types/estado';

interface SalaInfo {
  id: string;
  estado: Estado;
  updatedAt: string;
  updatedByNome: string | null;
}

export type StatusConexao = 'conectando' | 'ao_vivo' | 'reconectando';

function chaveCache(slug: string) {
  return `us-obs-cache-${slug}`;
}

function lerCache(slug: string): SalaInfo | null {
  try {
    const raw = localStorage.getItem(chaveCache(slug));
    return raw ? (JSON.parse(raw) as SalaInfo) : null;
  } catch {
    return null;
  }
}

function salvarCache(slug: string, info: SalaInfo) {
  try {
    localStorage.setItem(chaveCache(slug), JSON.stringify(info));
  } catch {
    // armazenamento indisponível (ex.: modo privado) — segue sem cache
  }
}

interface LinhaSala {
  id: string;
  estado: Estado;
  updated_at: string;
  updated_by_nome: string | null;
}

function paraInfo(linha: LinhaSala): SalaInfo {
  return {
    id: linha.id,
    estado: { ...ESTADO_PADRAO, ...linha.estado },
    updatedAt: linha.updated_at,
    updatedByNome: linha.updated_by_nome,
  };
}

export function useSala(slug: string) {
  const cacheInicial = lerCache(slug);
  const [sala, setSala] = useState<SalaInfo | null>(cacheInicial);
  const [status, setStatus] = useState<StatusConexao>('conectando');
  const slugRef = useRef(slug);
  slugRef.current = slug;

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      const { data, error } = await supabase
        .from('salas')
        .select('id, estado, updated_at, updated_by_nome')
        .eq('slug', slug)
        .single();
      if (!ativo) return;
      if (error || !data) {
        setStatus((atual) => (atual === 'ao_vivo' ? atual : 'reconectando'));
        return;
      }
      const info = paraInfo(data as LinhaSala);
      setSala(info);
      salvarCache(slug, info);
      setStatus('ao_vivo');
    }

    carregar();

    const canal = supabase
      .channel(`sala-${slug}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'salas', filter: `slug=eq.${slug}` },
        (payload: { new: LinhaSala }) => {
          const info = paraInfo(payload.new);
          setSala(info);
          salvarCache(slug, info);
          setStatus('ao_vivo');
        },
      )
      .subscribe((statusCanal: string) => {
        if (!ativo) return;
        if (statusCanal === 'SUBSCRIBED') setStatus('ao_vivo');
        else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(statusCanal)) {
          setStatus('reconectando');
        }
      });

    return () => {
      ativo = false;
      supabase.removeChannel(canal);
    };
  }, [slug]);

  const atualizar = useCallback(async (patch: Partial<Estado>) => {
    setSala((atual) => (atual ? { ...atual, estado: { ...atual.estado, ...patch } } : atual));
    const { error } = await supabase.rpc('atualizar_estado', { p_slug: slugRef.current, p_patch: patch });
    if (error) setStatus('reconectando');
  }, []);

  return {
    estado: sala?.estado ?? ESTADO_PADRAO,
    updatedAt: sala?.updatedAt,
    updatedByNome: sala?.updatedByNome,
    status,
    atualizar,
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm run test -- src/hooks/useSala.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSala.ts src/hooks/useSala.test.ts
git commit -m "feat: hook useSala (fetch, realtime, cache local, escrita otimista)"
```

---

### Task 7: Visual identity CSS and `Dots`

**Files:**
- Create: `src/styles/identidade.css`, `src/styles/overlays.css`, `src/components/overlay/Dots.tsx`, `src/components/overlay/Dots.test.tsx`

**Interfaces:**
- Produces: CSS custom properties (`--laranja`, `--tinta`, `--creme`, `--violeta`), global `@keyframes` (`acende`, `respira`, `corre`, `listra`, `entra`, `flutua`, `pisca`), and classnames consumed by every overlay component in Tasks 8–9 and the alert in Task 14. `<Dots variante="acende" | "respira" tamanho={number} gap={number} />` consumed by every scene with the ten-dot motif.

- [ ] **Step 1: `src/styles/identidade.css`**

```css
:root {
  --laranja: #ff6b1f;
  --tinta: #1a1417;
  --creme: #fff3e0;
  --violeta: #8b6cf0;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--tinta);
  color: var(--creme);
  font-family: 'JetBrains Mono', monospace;
}

a {
  color: var(--laranja);
}
a:hover {
  color: var(--creme);
}

button {
  font-family: 'JetBrains Mono', monospace;
  cursor: pointer;
}

input {
  font-family: inherit;
}
```

- [ ] **Step 2: `src/styles/overlays.css`** — keyframes plus static per-scene layout (ported 1:1 from `referencia/OBS-Cenas.dc.html`)

```css
@keyframes acende {
  0%, 100% { opacity: .15; }
  25%, 65% { opacity: 1; }
}
@keyframes respira {
  0%, 100% { opacity: .3; transform: scale(.75); }
  50% { opacity: 1; transform: scale(1); }
}
@keyframes corre {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
@keyframes listra {
  from { background-position: 0 0; }
  to { background-position: 147px 0; }
}
@keyframes entra {
  0% { transform: scale(.5) rotate(-12deg); opacity: 0; }
  70% { transform: scale(1.06) rotate(-2deg); opacity: 1; }
  100% { transform: scale(1) rotate(-3deg); }
}
@keyframes flutua {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-14px); }
}
@keyframes pisca {
  0%, 100% { opacity: 1; }
  50% { opacity: .2; }
}

.palco {
  position: relative;
  overflow: hidden;
  width: 1920px;
  height: 1080px;
  background: transparent;
  color: var(--creme);
  font-family: 'JetBrains Mono', monospace;
}

/* ---- Começando ---- */
.comecando { position: absolute; inset: 0; background: var(--tinta); overflow: hidden; }
.comecando__logoWrap { position: absolute; left: 170px; top: 170px; width: 560px; height: 560px; animation: flutua 6s ease-in-out infinite; }
.comecando__logo {
  width: 560px; height: 560px; background: var(--laranja); box-shadow: 26px 26px 0 var(--violeta);
  display: flex; align-items: center; justify-content: center;
  font: 600 390px/1 'Barlow Condensed', sans-serif; color: var(--tinta);
  animation: entra 1.2s cubic-bezier(.2,.9,.3,1.2) both;
}
.comecando__info { position: absolute; left: 880px; top: 170px; display: flex; flex-direction: column; gap: 18px; }
.comecando__label { font: 700 30px/1 'JetBrains Mono', monospace; letter-spacing: .16em; color: var(--laranja); }
.comecando__relogio { font: 600 330px/.82 'Barlow Condensed', sans-serif; font-variant-numeric: tabular-nums; color: var(--creme); }
.comecando__titulo { font: 600 96px/1 'Barlow Condensed', sans-serif; color: var(--creme); max-width: 940px; text-wrap: balance; }
.comecando__faixa { position: absolute; left: 0; top: 900px; width: 1920px; height: 110px; background: var(--laranja); overflow: hidden; display: flex; align-items: center; }
.comecando__faixaTexto { display: flex; white-space: nowrap; animation: corre 30s linear infinite; font: 600 64px/1 'Barlow Condensed', sans-serif; color: var(--tinta); }

/* ---- Intervalo ---- */
.intervalo { position: absolute; inset: 0; background: var(--tinta); overflow: hidden; }
.intervalo__logo { position: absolute; left: 80px; top: 70px; width: 150px; height: 150px; background: var(--laranja); display: flex; align-items: center; justify-content: center; font: 600 104px/1 'Barlow Condensed', sans-serif; color: var(--tinta); transform: rotate(-3deg); }
.intervalo__centro { position: absolute; left: 0; top: 250px; width: 1920px; display: flex; flex-direction: column; align-items: center; gap: 36px; }
.intervalo__label { font: 700 30px/1 'JetBrains Mono', monospace; letter-spacing: .2em; color: var(--violeta); }
.intervalo__msg { font: 600 240px/.88 'Barlow Condensed', sans-serif; color: var(--creme); text-align: center; max-width: 1600px; text-wrap: balance; }
.intervalo__listras { position: absolute; left: 0; top: 960px; width: 1920px; height: 120px; background: repeating-linear-gradient(-45deg, var(--laranja) 0 52px, var(--tinta) 52px 104px); animation: listra 8s linear infinite; }

/* ---- Encerramento ---- */
.encerramento { position: absolute; inset: 0; background: var(--laranja); overflow: hidden; }
.encerramento__logo { position: absolute; left: 170px; top: 80px; width: 170px; height: 170px; background: var(--tinta); display: flex; align-items: center; justify-content: center; font: 600 120px/1 'Barlow Condensed', sans-serif; color: var(--laranja); transform: rotate(-3deg); }
.encerramento__valeu { position: absolute; left: 160px; top: 300px; font: 600 300px/.82 'Barlow Condensed', sans-serif; color: var(--tinta); }
.encerramento__card { position: absolute; left: 1080px; top: 320px; width: 680px; padding: 48px; box-sizing: border-box; background: var(--tinta); box-shadow: 22px 22px 0 var(--violeta); display: flex; flex-direction: column; gap: 24px; }
.encerramento__cardLabel { font: 700 26px/1 'JetBrains Mono', monospace; letter-spacing: .16em; color: var(--laranja); }
.encerramento__proximo { font: 400 84px/1.05 'Bungee', sans-serif; color: var(--creme); text-wrap: balance; }
.encerramento__faixa { position: absolute; left: 0; top: 930px; width: 1920px; height: 100px; background: var(--tinta); overflow: hidden; display: flex; align-items: center; }
.encerramento__faixaTexto { display: flex; white-space: nowrap; animation: corre 30s linear infinite; font: 600 58px/1 'Barlow Condensed', sans-serif; color: var(--creme); }

/* ---- Jogo ---- */
.jogo__topoEsquerda { position: absolute; left: 40px; top: 36px; display: flex; align-items: center; gap: 14px; }
.jogo__logo { width: 96px; height: 96px; background: var(--laranja); display: flex; align-items: center; justify-content: center; font: 600 68px/1 'Barlow Condensed', sans-serif; color: var(--tinta); }
.jogo__aoVivo { display: flex; align-items: center; gap: 10px; background: var(--tinta); padding: 12px 16px; }
.jogo__bolinha { width: 14px; height: 14px; border-radius: 50%; background: var(--laranja); animation: pisca 1.4s infinite; }
.jogo__aoVivoTexto { font: 700 20px/1 'JetBrains Mono', monospace; letter-spacing: .14em; color: var(--creme); }
.jogo__placarWrap { position: absolute; left: 0; top: 36px; width: 1920px; display: flex; flex-direction: column; align-items: center; }
.jogo__placarLinha { display: flex; height: 96px; }
.jogo__time { width: 330px; background: var(--tinta); display: flex; align-items: center; justify-content: center; font: 600 58px/1 'Barlow Condensed', sans-serif; color: var(--creme); }
.jogo__gols { width: 230px; background: var(--laranja); display: flex; align-items: center; justify-content: center; gap: 18px; font: 400 62px/1 'Bungee', sans-serif; color: var(--tinta); }
.jogo__etiqueta { background: var(--violeta); padding: 8px 20px; font: 700 20px/1 'JetBrains Mono', monospace; letter-spacing: .12em; color: var(--tinta); }
.jogo__noAr { position: absolute; right: 40px; top: 36px; width: 300px; background: var(--tinta); padding: 20px 22px; box-sizing: border-box; display: flex; flex-direction: column; gap: 12px; box-shadow: 10px 10px 0 var(--laranja); }
.jogo__noArLabel { font: 700 18px/1 'JetBrains Mono', monospace; letter-spacing: .16em; color: var(--laranja); }
.jogo__noArItem { display: flex; align-items: center; gap: 12px; font: 600 36px/1 'Barlow Condensed', sans-serif; color: var(--creme); }
.jogo__noArBolinha { width: 12px; height: 12px; border-radius: 50%; background: var(--laranja); flex: none; }

/* ---- React / câmeras ---- */
.reactCameras__moldura { position: absolute; left: 40px; top: 40px; width: 1320px; height: 742px; box-sizing: border-box; border: 6px solid var(--laranja); box-shadow: 14px 14px 0 var(--violeta); }
.reactCameras__cam { position: absolute; left: 1400px; width: 480px; height: 270px; box-sizing: border-box; border: 5px solid var(--creme); }
.reactCameras__camLabel { position: absolute; left: -5px; bottom: -5px; background: var(--tinta); padding: 8px 14px; display: flex; align-items: center; gap: 10px; font: 600 32px/1 'Barlow Condensed', sans-serif; color: var(--creme); }
.reactCameras__camBolinha { width: 10px; height: 10px; border-radius: 50%; background: var(--laranja); }
.reactCameras__rodape { position: absolute; left: 40px; top: 910px; width: 1840px; height: 130px; background: var(--tinta); display: flex; align-items: center; gap: 36px; box-sizing: border-box; padding-right: 40px; }
.reactCameras__rodapeLogo { width: 130px; height: 130px; background: var(--laranja); display: flex; align-items: center; justify-content: center; font: 600 92px/1 'Barlow Condensed', sans-serif; color: var(--tinta); flex: none; }
.reactCameras__rodapeLabel { font: 700 22px/1 'JetBrains Mono', monospace; letter-spacing: .16em; color: var(--laranja); flex: none; }
.reactCameras__rodapeTitulo { font: 600 64px/1 'Barlow Condensed', sans-serif; color: var(--creme); flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ---- Nome (lower third) ---- */
.nome { position: absolute; left: 80px; top: 830px; display: flex; transition: transform .6s cubic-bezier(.2,.9,.3,1.1), opacity .4s; }
.nome__logo { width: 150px; height: 150px; background: var(--laranja); display: flex; align-items: center; justify-content: center; font: 600 100px/1 'Barlow Condensed', sans-serif; color: var(--tinta); flex: none; }
.nome__caixa { height: 150px; background: var(--tinta); padding: 0 48px 0 36px; display: flex; flex-direction: column; justify-content: center; gap: 12px; box-shadow: 12px 12px 0 var(--violeta); }
.nome__nome { font: 600 78px/.9 'Barlow Condensed', sans-serif; color: var(--creme); white-space: nowrap; }
.nome__funcao { font: 700 24px/1 'JetBrains Mono', monospace; letter-spacing: .14em; color: var(--laranja); white-space: nowrap; }

/* ---- Alerta (doação) ---- */
.alerta { position: absolute; left: 660px; top: 830px; display: flex; align-items: center; gap: 0; transition: transform .5s cubic-bezier(.2,.9,.3,1.1), opacity .4s; }
.alerta__icone { width: 150px; height: 150px; background: var(--violeta); display: flex; align-items: center; justify-content: center; font: 600 90px/1 'Barlow Condensed', sans-serif; color: var(--tinta); flex: none; animation: flutua 2s ease-in-out infinite; }
.alerta__caixa { min-height: 150px; background: var(--tinta); padding: 20px 48px 20px 36px; display: flex; flex-direction: column; justify-content: center; gap: 8px; box-shadow: 12px 12px 0 var(--laranja); max-width: 900px; }
.alerta__nome { font: 600 56px/1 'Barlow Condensed', sans-serif; color: var(--creme); white-space: nowrap; }
.alerta__mensagem { font: 400 28px/1.2 'JetBrains Mono', monospace; color: var(--laranja); text-wrap: balance; }

.dots { display: flex; gap: 22px; margin-top: 18px; }
.dots__item { border-radius: 50%; }
```

- [ ] **Step 3: Write the failing test — `src/components/overlay/Dots.test.tsx`**

```tsx
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Dots } from './Dots';

describe('Dots', () => {
  it('renderiza dez pontos', () => {
    const { container } = render(<Dots variante="acende" />);
    expect(container.querySelectorAll('.dots__item')).toHaveLength(10);
  });

  it('usa a animação "respira" quando a variante é respira', () => {
    const { container } = render(<Dots variante="respira" />);
    const primeiro = container.querySelector('.dots__item') as HTMLElement;
    expect(primeiro.style.animation).toContain('respira');
  });
});
```

- [ ] **Step 4: Run to verify failure**

Run: `npm run test -- src/components/overlay/Dots.test.tsx`
Expected: FAIL — `Dots.tsx` doesn't exist.

- [ ] **Step 5: Implement `src/components/overlay/Dots.tsx`**

```tsx
interface DotsProps {
  variante: 'acende' | 'respira';
  tamanho?: number;
}

export function Dots({ variante, tamanho = 30 }: DotsProps) {
  return (
    <div className="dots">
      {Array.from({ length: 10 }, (_, i) => {
        const animacao =
          variante === 'acende' ? `acende 3s ${(i * 0.25).toFixed(2)}s infinite` : `respira 5s ${(i * 0.2).toFixed(1)}s infinite ease-in-out`;
        const cor = variante === 'acende' ? (i === 0 ? 'var(--laranja)' : 'var(--creme)') : 'var(--laranja)';
        return (
          <div
            key={i}
            className="dots__item"
            style={{ width: tamanho, height: tamanho, background: cor, animation: animacao }}
          />
        );
      })}
    </div>
  );
}
```

- [ ] **Step 6: Run to verify pass**

Run: `npm run test -- src/components/overlay/Dots.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 7: Import CSS globally** — add to `src/main.tsx`:

```tsx
import './styles/identidade.css';
import './styles/overlays.css';
```

- [ ] **Step 8: Commit**

```bash
git add src/styles/identidade.css src/styles/overlays.css src/components/overlay/Dots.tsx src/components/overlay/Dots.test.tsx src/main.tsx
git commit -m "feat: identidade visual, CSS das cenas e componente Dots"
```

---

### Task 8: Overlay scenes — Começando, Intervalo, Encerramento

**Files:**
- Create: `src/components/overlay/Comecando.tsx` (+`.test.tsx`), `src/components/overlay/Intervalo.tsx` (+`.test.tsx`), `src/components/overlay/Encerramento.tsx` (+`.test.tsx`)

**Interfaces:**
- Consumes: `Estado` (Task 2), `Dots` and `overlays.css` classes (Task 7).
- Produces: `<Comecando estado titulo restanteMs />`, `<Intervalo estado />`, `<Encerramento estado />`. Consumed by `OverlayPage` (Task 10).

- [ ] **Step 1: Failing test — `Comecando.test.tsx`**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Comecando } from './Comecando';
import { ESTADO_PADRAO } from '../../types/estado';

describe('Comecando', () => {
  it('mostra o título e a contagem regressiva formatada', () => {
    render(<Comecando estado={{ ...ESTADO_PADRAO, titulo: 'RESENHA DE SEXTA' }} restanteMs={65_000} />);
    expect(screen.getByText('RESENHA DE SEXTA')).toBeInTheDocument();
    expect(screen.getByText('01:05')).toBeInTheDocument();
    expect(screen.getByText('A TRANSMISSÃO COMEÇA EM')).toBeInTheDocument();
  });

  it('mostra "JÁ" e "VAI COMEÇAR" quando a contagem termina', () => {
    render(<Comecando estado={{ ...ESTADO_PADRAO, fim: 1 }} restanteMs={0} />);
    expect(screen.getByText('JÁ')).toBeInTheDocument();
    expect(screen.getByText('VAI COMEÇAR')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npm run test -- src/components/overlay/Comecando.test.tsx` → FAIL.

- [ ] **Step 3: Implement `Comecando.tsx`**

```tsx
import { Estado } from '../../types/estado';
import { formatRelogio } from '../../lib/tempo';
import { Dots } from './Dots';

interface Props {
  estado: Estado;
  restanteMs: number;
}

export function Comecando({ estado, restanteMs }: Props) {
  const acabou = !!estado.fim && restanteMs === 0;
  const relogio = acabou ? 'JÁ' : formatRelogio(restanteMs);
  const label = acabou ? 'VAI COMEÇAR' : 'A TRANSMISSÃO COMEÇA EM';

  return (
    <div className="comecando">
      <div className="comecando__logoWrap">
        <div className="comecando__logo">US</div>
      </div>
      <div className="comecando__info">
        <div className="comecando__label">{label}</div>
        <div className="comecando__relogio">{relogio}</div>
        <div className="comecando__titulo">{estado.titulo}</div>
        <Dots variante="acende" />
      </div>
      <div className="comecando__faixa">
        <div className="comecando__faixaTexto">
          <span>UNIDADE SECRETA ● RESENHA ● AO VIVO ● UNIDADE SECRETA ● RESENHA ● AO VIVO ● UNIDADE SECRETA ● RESENHA ● AO VIVO ● </span>
          <span>UNIDADE SECRETA ● RESENHA ● AO VIVO ● UNIDADE SECRETA ● RESENHA ● AO VIVO ● UNIDADE SECRETA ● RESENHA ● AO VIVO ● </span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify pass** — PASS (2 tests).

- [ ] **Step 5: Failing test — `Intervalo.test.tsx`**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Intervalo } from './Intervalo';
import { ESTADO_PADRAO } from '../../types/estado';

describe('Intervalo', () => {
  it('mostra a mensagem do intervalo', () => {
    render(<Intervalo estado={{ ...ESTADO_PADRAO, msg: 'JÁ VOLTAMOS' }} />);
    expect(screen.getByText('JÁ VOLTAMOS')).toBeInTheDocument();
    expect(screen.getByText('INTERVALO')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run to verify failure**, then implement `Intervalo.tsx`:

```tsx
import { Estado } from '../../types/estado';
import { Dots } from './Dots';

interface Props {
  estado: Estado;
}

export function Intervalo({ estado }: Props) {
  return (
    <div className="intervalo">
      <div className="intervalo__logo">US</div>
      <div className="intervalo__centro">
        <div className="intervalo__label">INTERVALO</div>
        <div className="intervalo__msg">{estado.msg}</div>
        <Dots variante="respira" />
      </div>
      <div className="intervalo__listras" />
    </div>
  );
}
```

- [ ] **Step 7: Run to verify pass** — PASS.

- [ ] **Step 8: Failing test — `Encerramento.test.tsx`**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Encerramento } from './Encerramento';
import { ESTADO_PADRAO } from '../../types/estado';

describe('Encerramento', () => {
  it('mostra o próximo episódio', () => {
    render(<Encerramento estado={{ ...ESTADO_PADRAO, proximo: 'SÁBADO, 20H' }} />);
    expect(screen.getByText('SÁBADO, 20H')).toBeInTheDocument();
    expect(screen.getByText('PRÓXIMO EPISÓDIO')).toBeInTheDocument();
  });
});
```

- [ ] **Step 9: Run to verify failure**, then implement `Encerramento.tsx`:

```tsx
import { Estado } from '../../types/estado';
import { Dots } from './Dots';

interface Props {
  estado: Estado;
}

export function Encerramento({ estado }: Props) {
  return (
    <div className="encerramento">
      <div className="encerramento__logo">US</div>
      <div className="encerramento__valeu">
        VALEU,
        <br />
        GALERA
      </div>
      <div className="encerramento__card">
        <div className="encerramento__cardLabel">PRÓXIMO EPISÓDIO</div>
        <div className="encerramento__proximo">{estado.proximo}</div>
        <Dots variante="acende" tamanho={22} />
      </div>
      <div className="encerramento__faixa">
        <div className="encerramento__faixaTexto">
          <span>SE INSCREVE ● ENTRA PRA RESENHA ● SE INSCREVE ● ENTRA PRA RESENHA ● SE INSCREVE ● ENTRA PRA RESENHA ● </span>
          <span>SE INSCREVE ● ENTRA PRA RESENHA ● SE INSCREVE ● ENTRA PRA RESENHA ● SE INSCREVE ● ENTRA PRA RESENHA ● </span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 10: Run all three test files to verify pass**

Run: `npm run test -- src/components/overlay`
Expected: PASS (5 tests)

- [ ] **Step 11: Commit**

```bash
git add src/components/overlay/Comecando.tsx src/components/overlay/Comecando.test.tsx src/components/overlay/Intervalo.tsx src/components/overlay/Intervalo.test.tsx src/components/overlay/Encerramento.tsx src/components/overlay/Encerramento.test.tsx
git commit -m "feat: cenas de overlay começando, intervalo e encerramento"
```

---

### Task 9: Overlay scenes — Jogo, ReactCameras, Nome

**Files:**
- Create: `src/components/overlay/Jogo.tsx` (+`.test.tsx`), `src/components/overlay/ReactCameras.tsx` (+`.test.tsx`), `src/components/overlay/Nome.tsx` (+`.test.tsx`)

**Interfaces:**
- Consumes: `Estado`, `Membro` (Task 2); `overlays.css` (Task 7).
- Produces: `<Jogo estado />`, `<ReactCameras estado />`, `<Nome estado agoraServidor />`. Consumed by `OverlayPage` (Task 10).

- [ ] **Step 1: Failing test — `Jogo.test.tsx`**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Jogo } from './Jogo';
import { ESTADO_PADRAO } from '../../types/estado';

describe('Jogo', () => {
  it('mostra os times, o placar e quem está no ar', () => {
    render(
      <Jogo
        estado={{
          ...ESTADO_PADRAO,
          timeA: 'RUBRO',
          timeB: 'AZUL',
          golsA: 2,
          golsB: 1,
          jogo: 'FIFA · RODADA 3',
          noAr: [0, 1],
        }}
      />,
    );
    expect(screen.getByText('RUBRO')).toBeInTheDocument();
    expect(screen.getByText('AZUL')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('FIFA · RODADA 3')).toBeInTheDocument();
    expect(screen.getByText('NO AR · 2')).toBeInTheDocument();
    expect(screen.getByText('NOME 01')).toBeInTheDocument();
    expect(screen.getByText('NOME 02')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure**, then implement `Jogo.tsx`:

```tsx
import { Estado } from '../../types/estado';

interface Props {
  estado: Estado;
}

export function Jogo({ estado }: Props) {
  const noAr = estado.noAr.map((i) => estado.membros[i]).filter(Boolean);

  return (
    <>
      <div className="jogo__topoEsquerda">
        <div className="jogo__logo">US</div>
        <div className="jogo__aoVivo">
          <div className="jogo__bolinha" />
          <div className="jogo__aoVivoTexto">AO VIVO</div>
        </div>
      </div>
      <div className="jogo__placarWrap">
        <div className="jogo__placarLinha">
          <div className="jogo__time">{estado.timeA}</div>
          <div className="jogo__gols">
            <span>{estado.golsA}</span>
            <span>–</span>
            <span>{estado.golsB}</span>
          </div>
          <div className="jogo__time">{estado.timeB}</div>
        </div>
        <div className="jogo__etiqueta">{estado.jogo}</div>
      </div>
      <div className="jogo__noAr">
        <div className="jogo__noArLabel">NO AR · {noAr.length}</div>
        {noAr.map((m, i) => (
          <div className="jogo__noArItem" key={i}>
            <div className="jogo__noArBolinha" />
            {m.n}
          </div>
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Run to verify pass**.

- [ ] **Step 4: Failing test — `ReactCameras.test.tsx`**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReactCameras } from './ReactCameras';
import { ESTADO_PADRAO } from '../../types/estado';

describe('ReactCameras', () => {
  it('mostra até três câmeras e o título', () => {
    render(<ReactCameras estado={{ ...ESTADO_PADRAO, cams: ['JOÃO', 'MARIA', 'PEDRO'], titulo: 'REACT DA FINAL' }} />);
    expect(screen.getByText('JOÃO')).toBeInTheDocument();
    expect(screen.getByText('MARIA')).toBeInTheDocument();
    expect(screen.getByText('PEDRO')).toBeInTheDocument();
    expect(screen.getByText('REACT DA FINAL')).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run to verify failure**, then implement `ReactCameras.tsx`:

```tsx
import { Estado } from '../../types/estado';
import { Dots } from './Dots';

interface Props {
  estado: Estado;
}

export function ReactCameras({ estado }: Props) {
  return (
    <>
      <div className="reactCameras__moldura" />
      {estado.cams.slice(0, 3).map((nome, i) => (
        <div className="reactCameras__cam" style={{ top: 40 + i * 286 }} key={i}>
          <div className="reactCameras__camLabel">
            <div className="reactCameras__camBolinha" />
            {nome}
          </div>
        </div>
      ))}
      <div className="reactCameras__rodape">
        <div className="reactCameras__rodapeLogo">US</div>
        <div className="reactCameras__rodapeLabel">REACT</div>
        <div className="reactCameras__rodapeTitulo">{estado.titulo}</div>
        <Dots variante="acende" tamanho={18} />
      </div>
    </>
  );
}
```

- [ ] **Step 6: Run to verify pass**.

- [ ] **Step 7: Failing test — `Nome.test.tsx`**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Nome } from './Nome';
import { ESTADO_PADRAO } from '../../types/estado';

describe('Nome', () => {
  it('mostra o nome em destaque quando dentro da janela de tempo', () => {
    render(<Nome estado={{ ...ESTADO_PADRAO, lt: 0, ltAte: 20_000 }} agoraServidor={10_000} />);
    expect(screen.getByText('NOME 01')).toBeInTheDocument();
    expect(screen.getByText('UNIDADE SECRETA')).toBeInTheDocument();
  });

  it('fica fora da tela quando o tempo expirou', () => {
    const { container } = render(<Nome estado={{ ...ESTADO_PADRAO, lt: 0, ltAte: 5_000 }} agoraServidor={10_000} />);
    const raiz = container.querySelector('.nome') as HTMLElement;
    expect(raiz.style.opacity).toBe('0');
  });
});
```

- [ ] **Step 8: Run to verify failure**, then implement `Nome.tsx`:

```tsx
import { Estado } from '../../types/estado';

interface Props {
  estado: Estado;
  agoraServidor: number;
}

export function Nome({ estado, agoraServidor }: Props) {
  const membro = estado.membros[estado.lt] ?? estado.membros[0];
  const ativo = !!estado.membros[estado.lt] && agoraServidor < estado.ltAte;

  return (
    <div
      className="nome"
      style={{
        transform: ativo ? 'translateX(0)' : 'translateX(-1100px)',
        opacity: ativo ? 1 : 0,
      }}
    >
      <div className="nome__logo">US</div>
      <div className="nome__caixa">
        <div className="nome__nome">{membro.n}</div>
        <div className="nome__funcao">{membro.f}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Run all three test files to verify pass**

Run: `npm run test -- src/components/overlay`
Expected: PASS (all 9 overlay tests from Tasks 8+9)

- [ ] **Step 10: Commit**

```bash
git add src/components/overlay/Jogo.tsx src/components/overlay/Jogo.test.tsx src/components/overlay/ReactCameras.tsx src/components/overlay/ReactCameras.test.tsx src/components/overlay/Nome.tsx src/components/overlay/Nome.test.tsx
git commit -m "feat: cenas de overlay jogo, react/câmeras e nome (lower third)"
```

---

### Task 10: `OverlayPage` route

**Files:**
- Create: `src/pages/OverlayPage.tsx`, `src/pages/OverlayPage.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useSala` (Task 6), `useServerClock` (Task 5), `calcularRestante` (Task 2), all overlay scene components (Tasks 8–9), plus `Alerta` (added later in Task 14 — stub it out as "not yet implemented" is **not allowed**, so this task includes a minimal placeholder scene that Task 14 replaces in place, keeping the route table exhaustive from the start).
- Produces: route `/overlay/:cena` mounted in `App.tsx`.

- [ ] **Step 1: Minimal placeholder for the alert scene so the switch is exhaustive today**

Create `src/components/overlay/Alerta.tsx` now with the real visual (Task 14 will only add the realtime wiring on top of it, not redo the visuals):

```tsx
interface Props {
  visivel: boolean;
  nome: string;
  mensagem: string;
}

export function Alerta({ visivel, nome, mensagem }: Props) {
  return (
    <div className="alerta" style={{ transform: visivel ? 'translateY(0)' : 'translateY(220px)', opacity: visivel ? 1 : 0 }}>
      <div className="alerta__icone">$</div>
      <div className="alerta__caixa">
        <div className="alerta__nome">{nome || '—'}</div>
        <div className="alerta__mensagem">{mensagem}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write the failing test — `OverlayPage.test.tsx`**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { OverlayPage } from './OverlayPage';
import { ESTADO_PADRAO } from '../types/estado';

vi.mock('../hooks/useSala', () => ({
  useSala: () => ({ estado: { ...ESTADO_PADRAO, timeA: 'RUBRO' }, status: 'ao_vivo', updatedAt: undefined, updatedByNome: null, atualizar: vi.fn() }),
}));
vi.mock('../hooks/useServerClock', () => ({ useServerClock: () => 1_000_000 }));

function renderRota(cena: string) {
  return render(
    <MemoryRouter initialEntries={[`/overlay/${cena}?sala=principal`]}>
      <Routes>
        <Route path="/overlay/:cena" element={<OverlayPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('OverlayPage', () => {
  it('renderiza a cena de jogo com o estado da sala', () => {
    renderRota('jogo');
    expect(screen.getByText('RUBRO')).toBeInTheDocument();
  });

  it('renderiza a cena de começando', () => {
    renderRota('comecando');
    expect(screen.getByText('A TRANSMISSÃO COMEÇA EM')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npm run test -- src/pages/OverlayPage.test.tsx`
Expected: FAIL — `OverlayPage.tsx` doesn't exist.

- [ ] **Step 4: Implement `src/pages/OverlayPage.tsx`**

```tsx
import { useParams, useSearchParams } from 'react-router-dom';
import { useSala } from '../hooks/useSala';
import { useServerClock } from '../hooks/useServerClock';
import { calcularRestante } from '../lib/tempo';
import { Cena } from '../types/estado';
import { Comecando } from '../components/overlay/Comecando';
import { Intervalo } from '../components/overlay/Intervalo';
import { Encerramento } from '../components/overlay/Encerramento';
import { Jogo } from '../components/overlay/Jogo';
import { ReactCameras } from '../components/overlay/ReactCameras';
import { Nome } from '../components/overlay/Nome';
import { Alerta } from '../components/overlay/Alerta';

export function OverlayPage() {
  const { cena } = useParams<{ cena: Cena }>();
  const [params] = useSearchParams();
  const slug = params.get('sala') || 'principal';
  const { estado } = useSala(slug);
  const agoraServidor = useServerClock();
  const restanteMs = calcularRestante(estado, agoraServidor);

  return (
    <div className="palco">
      {cena === 'comecando' && <Comecando estado={estado} restanteMs={restanteMs} />}
      {cena === 'intervalo' && <Intervalo estado={estado} />}
      {cena === 'encerramento' && <Encerramento estado={estado} />}
      {cena === 'jogo' && <Jogo estado={estado} />}
      {cena === 'react' && <ReactCameras estado={estado} />}
      {cena === 'nome' && <Nome estado={estado} agoraServidor={agoraServidor} />}
      {cena === 'alerta' && <Alerta visivel={false} nome="" mensagem="" />}
    </div>
  );
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npm run test -- src/pages/OverlayPage.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 6: Wire the route into `src/App.tsx`**

```tsx
import { Route, Routes } from 'react-router-dom';
import { OverlayPage } from './pages/OverlayPage';

export default function App() {
  return (
    <Routes>
      <Route path="/overlay/:cena" element={<OverlayPage />} />
    </Routes>
  );
}
```

- [ ] **Step 7: Manual check** — run `npm run dev`, open `http://localhost:5173/overlay/comecando?sala=principal` (this will fail to reach Supabase until `.env.local` has real keys — that's expected before Task 17; confirm it renders the default/mock state without crashing, using `ESTADO_PADRAO` from the failed-fetch fallback).

- [ ] **Step 8: Commit**

```bash
git add src/pages/OverlayPage.tsx src/pages/OverlayPage.test.tsx src/components/overlay/Alerta.tsx src/App.tsx
git commit -m "feat: rota /overlay/:cena"
```

---

### Task 11: Authentication — `useAuth`, `LoginPage`, `RotaProtegida`

**Files:**
- Create: `src/hooks/useAuth.ts`, `src/hooks/useAuth.test.ts`, `src/pages/LoginPage.tsx`, `src/components/RotaProtegida.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `supabase.auth.*`, `supabase.from('membros_equipe')...` (Task 3).
- Produces: `useAuth(): { carregando: boolean; sessao: Session | null; papel: 'admin' | 'editor' | null }`, `<RotaProtegida>{children}</RotaProtegida>` — used to guard `/painel` and `/admin` (Tasks 12, 15).

- [ ] **Step 1: Failing test — `useAuth.test.ts`**

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuth } from './useAuth';

vi.mock('../lib/supabase', () => {
  const onAuthStateChange = vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }));
  const getSession = vi.fn();
  const single = vi.fn();
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { supabase: { auth: { getSession, onAuthStateChange }, from } };
});

import { supabase } from '../lib/supabase';

describe('useAuth', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolve papel a partir de membros_equipe quando há sessão', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'a@a.com' } } },
    } as never);
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { papel: 'admin' }, error: null }) })) })),
    } as never);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.papel).toBe('admin');
  });

  it('retorna papel nulo quando não há sessão', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } } as never);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.papel).toBeNull();
    expect(result.current.sessao).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**, then implement `src/hooks/useAuth.ts`:

```ts
import { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Papel = 'admin' | 'editor' | null;

export function useAuth() {
  const [carregando, setCarregando] = useState(true);
  const [sessao, setSessao] = useState<Session | null>(null);
  const [papel, setPapel] = useState<Papel>(null);

  useEffect(() => {
    let ativo = true;

    async function resolverPapel(sessaoAtual: Session | null) {
      if (!sessaoAtual) {
        if (ativo) {
          setSessao(null);
          setPapel(null);
          setCarregando(false);
        }
        return;
      }
      const { data } = await supabase.from('membros_equipe').select('papel').eq('user_id', sessaoAtual.user.id).single();
      if (!ativo) return;
      setSessao(sessaoAtual);
      setPapel((data?.papel as Papel) ?? null);
      setCarregando(false);
    }

    supabase.auth.getSession().then(({ data }) => resolverPapel(data.session));

    const { data: assinatura } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setCarregando(true);
      resolverPapel(novaSessao);
    });

    return () => {
      ativo = false;
      assinatura.subscription.unsubscribe();
    };
  }, []);

  return { carregando, sessao, papel };
}
```

- [ ] **Step 3: Run to verify pass**.

- [ ] **Step 4: `src/pages/LoginPage.tsx`**

```tsx
import { FormEvent, useState } from 'react';
import { supabase } from '../lib/supabase';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');

  async function enviarLink(e: FormEvent) {
    e.preventDefault();
    setErro('');
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + '/painel' } });
    if (error) setErro('Não foi possível enviar o link. Tenta de novo.');
    else setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="tela-cheia">
        <p>Manda ver no seu e-mail — o link de acesso chegou em {email}.</p>
      </div>
    );
  }

  return (
    <div className="tela-cheia">
      <form onSubmit={enviarLink} className="login-form">
        <div className="login-form__logo">US</div>
        <h1>PAINEL AO VIVO</h1>
        <input
          type="email"
          required
          placeholder="seu-email@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit">ENVIAR LINK DE ACESSO</button>
        {erro && <p className="login-form__erro">{erro}</p>}
      </form>
    </div>
  );
}
```

- [ ] **Step 5: `src/components/RotaProtegida.tsx`**

```tsx
import { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function RotaProtegida({ children }: PropsWithChildren) {
  const { carregando, sessao, papel } = useAuth();

  if (carregando) return <div className="tela-cheia">Carregando…</div>;
  if (!sessao) return <Navigate to="/login" replace />;
  if (!papel) return <div className="tela-cheia">Sua conta ainda não foi liberada pela equipe. Fala com um admin.</div>;

  return <>{children}</>;
}
```

- [ ] **Step 6: Add minimal `.tela-cheia` / `.login-form` styles to `src/styles/identidade.css`** (append):

```css
.tela-cheia {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 360px;
}

.login-form__logo {
  width: 56px;
  height: 56px;
  background: var(--laranja);
  color: var(--tinta);
  display: flex;
  align-items: center;
  justify-content: center;
  font: 600 38px/1 'Barlow Condensed', sans-serif;
  margin: 0 auto;
}

.login-form input {
  background: #2a2226;
  border: 2px solid #3a3136;
  color: var(--creme);
  font: 600 20px 'Barlow Condensed', sans-serif;
  padding: 12px;
}

.login-form button {
  background: var(--laranja);
  color: var(--tinta);
  border: 0;
  padding: 14px;
  font: 700 13px/1 'JetBrains Mono', monospace;
  letter-spacing: 0.1em;
}

.login-form__erro {
  color: var(--laranja);
}
```

- [ ] **Step 7: Wire routes into `src/App.tsx`**

```tsx
import { Route, Routes } from 'react-router-dom';
import { OverlayPage } from './pages/OverlayPage';
import { LoginPage } from './pages/LoginPage';

export default function App() {
  return (
    <Routes>
      <Route path="/overlay/:cena" element={<OverlayPage />} />
      <Route path="/login" element={<LoginPage />} />
    </Routes>
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useAuth.ts src/hooks/useAuth.test.ts src/pages/LoginPage.tsx src/components/RotaProtegida.tsx src/styles/identidade.css src/App.tsx
git commit -m "feat: autenticação por magic link e rota protegida"
```

---

### Task 12: `PainelPage` — começando, intervalo, encerramento, placar

**Files:**
- Create: `src/pages/PainelPage.tsx`, `src/pages/PainelPage.test.tsx`, `src/components/painel/IndicadorStatus.tsx`, `src/components/painel/SecaoComecando.tsx`, `src/components/painel/SecaoIntervalo.tsx`, `src/components/painel/SecaoEncerramento.tsx`, `src/components/painel/SecaoPlacar.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useSala` (Task 6), `useServerClock`/`calcularRestante`/`formatRelogio`/`formatarTempoRelativo` (Tasks 2/5), `RotaProtegida` (Task 11).
- Produces: `<SecaoComecando estado atualizar restanteMs />`, `<SecaoIntervalo estado atualizar />`, `<SecaoEncerramento estado atualizar />`, `<SecaoPlacar estado atualizar />`, `<IndicadorStatus status updatedAt updatedByNome agoraServidor />`. Wired together by `PainelPage`, consumed later by Task 13's additional sections.

- [ ] **Step 1: `src/components/painel/IndicadorStatus.tsx`**

```tsx
import { formatarTempoRelativo } from '../../lib/tempo';

interface Props {
  status: 'conectando' | 'ao_vivo' | 'reconectando';
  updatedAt?: string;
  updatedByNome?: string | null;
  agoraServidor: number;
}

export function IndicadorStatus({ status, updatedAt, updatedByNome, agoraServidor }: Props) {
  const cor = status === 'ao_vivo' ? 'var(--laranja)' : '#8a7f84';
  const texto = status === 'ao_vivo' ? 'AO VIVO' : status === 'reconectando' ? 'RECONECTANDO…' : 'CONECTANDO…';

  return (
    <div className="indicador-status">
      <span className="indicador-status__bolinha" style={{ background: cor }} />
      <span>{texto}</span>
      {updatedByNome && updatedAt && (
        <span className="indicador-status__editado">
          · editado por {updatedByNome} {formatarTempoRelativo(new Date(updatedAt).getTime(), agoraServidor)}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: `src/components/painel/SecaoComecando.tsx`**

```tsx
import { Estado } from '../../types/estado';
import { formatRelogio } from '../../lib/tempo';

interface Props {
  estado: Estado;
  restanteMs: number;
  atualizar: (patch: Partial<Estado>) => void;
}

export function SecaoComecando({ estado, restanteMs, atualizar }: Props) {
  return (
    <section className="secao">
      <h2>COMEÇANDO</h2>
      <input
        value={estado.titulo}
        placeholder="Título da live"
        onChange={(e) => atualizar({ titulo: e.target.value })}
      />
      <div className="secao__linha">
        <input
          type="number"
          min={1}
          value={estado.minutos}
          onChange={(e) => atualizar({ minutos: Math.max(1, parseInt(e.target.value, 10) || 1) })}
          className="secao__numero"
        />
        <span>min</span>
        <button onClick={() => atualizar({ fim: Date.now() + estado.minutos * 60_000 })}>INICIAR CONTAGEM</button>
        <button className="secao__botaoSecundario" onClick={() => atualizar({ fim: 0 })}>
          ZERAR
        </button>
        <span className="secao__relogio">{estado.fim ? formatRelogio(restanteMs) : ''}</span>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: `src/components/painel/SecaoIntervalo.tsx`**

```tsx
import { Estado } from '../../types/estado';

interface Props {
  estado: Estado;
  atualizar: (patch: Partial<Estado>) => void;
}

export function SecaoIntervalo({ estado, atualizar }: Props) {
  return (
    <section className="secao">
      <h2>INTERVALO · MENSAGEM</h2>
      <input value={estado.msg} onChange={(e) => atualizar({ msg: e.target.value })} />
    </section>
  );
}
```

- [ ] **Step 4: `src/components/painel/SecaoEncerramento.tsx`**

```tsx
import { Estado } from '../../types/estado';

interface Props {
  estado: Estado;
  atualizar: (patch: Partial<Estado>) => void;
}

export function SecaoEncerramento({ estado, atualizar }: Props) {
  return (
    <section className="secao">
      <h2>ENCERRAMENTO · PRÓXIMO EPISÓDIO</h2>
      <input value={estado.proximo} onChange={(e) => atualizar({ proximo: e.target.value })} />
    </section>
  );
}
```

- [ ] **Step 5: `src/components/painel/SecaoPlacar.tsx`**

```tsx
import { Estado } from '../../types/estado';

interface Props {
  estado: Estado;
  atualizar: (patch: Partial<Estado>) => void;
}

export function SecaoPlacar({ estado, atualizar }: Props) {
  const somar = (chave: 'golsA' | 'golsB', delta: number) => atualizar({ [chave]: Math.max(0, estado[chave] + delta) });

  return (
    <section className="secao">
      <h2>PLACAR</h2>
      <input value={estado.jogo} placeholder="Etiqueta (ex: FIFA · RODADA 3)" onChange={(e) => atualizar({ jogo: e.target.value })} />
      <div className="secao__placarGrade">
        <input value={estado.timeA} onChange={(e) => atualizar({ timeA: e.target.value })} />
        <button onClick={() => somar('golsA', -1)}>−</button>
        <div className="secao__golNumero">{estado.golsA}</div>
        <button className="secao__botaoDestaque" onClick={() => somar('golsA', 1)}>
          +
        </button>
        <input value={estado.timeB} onChange={(e) => atualizar({ timeB: e.target.value })} />
        <button onClick={() => somar('golsB', -1)}>−</button>
        <div className="secao__golNumero">{estado.golsB}</div>
        <button className="secao__botaoDestaque" onClick={() => somar('golsB', 1)}>
          +
        </button>
      </div>
      <button className="secao__botaoSecundario" onClick={() => atualizar({ golsA: 0, golsB: 0 })}>
        ZERAR PLACAR
      </button>
    </section>
  );
}
```

- [ ] **Step 6: Failing test — `PainelPage.test.tsx`**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PainelPage } from './PainelPage';
import { ESTADO_PADRAO } from '../types/estado';

const atualizar = vi.fn();

vi.mock('../hooks/useSala', () => ({
  useSala: () => ({ estado: ESTADO_PADRAO, status: 'ao_vivo', updatedAt: '2026-01-01T00:00:00Z', updatedByNome: 'FULANO', atualizar }),
}));
vi.mock('../hooks/useServerClock', () => ({ useServerClock: () => 1_000_000 }));

describe('PainelPage', () => {
  it('atualiza o título ao digitar', () => {
    render(<PainelPage />);
    const campo = screen.getByPlaceholderText('Título da live');
    fireEvent.change(campo, { target: { value: 'NOVO TÍTULO' } });
    expect(atualizar).toHaveBeenCalledWith({ titulo: 'NOVO TÍTULO' });
  });

  it('incrementa o placar do time A', () => {
    render(<PainelPage />);
    const botoesMais = screen.getAllByText('+');
    fireEvent.click(botoesMais[0]);
    expect(atualizar).toHaveBeenCalledWith({ golsA: 1 });
  });

  it('mostra quem editou por último', () => {
    render(<PainelPage />);
    expect(screen.getByText(/editado por FULANO/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run to verify failure**, then implement `src/pages/PainelPage.tsx`:

```tsx
import { useSearchParams } from 'react-router-dom';
import { useSala } from '../hooks/useSala';
import { useServerClock } from '../hooks/useServerClock';
import { calcularRestante } from '../lib/tempo';
import { IndicadorStatus } from '../components/painel/IndicadorStatus';
import { SecaoComecando } from '../components/painel/SecaoComecando';
import { SecaoIntervalo } from '../components/painel/SecaoIntervalo';
import { SecaoEncerramento } from '../components/painel/SecaoEncerramento';
import { SecaoPlacar } from '../components/painel/SecaoPlacar';

export function PainelPage() {
  const [params] = useSearchParams();
  const slug = params.get('sala') || 'principal';
  const { estado, status, updatedAt, updatedByNome, atualizar } = useSala(slug);
  const agoraServidor = useServerClock();
  const restanteMs = calcularRestante(estado, agoraServidor);

  return (
    <div className="painel">
      <header className="painel__cabecalho">
        <div className="painel__logo">US</div>
        <h1>PAINEL AO VIVO</h1>
      </header>
      <IndicadorStatus status={status} updatedAt={updatedAt} updatedByNome={updatedByNome} agoraServidor={agoraServidor} />
      <SecaoComecando estado={estado} restanteMs={restanteMs} atualizar={atualizar} />
      <SecaoIntervalo estado={estado} atualizar={atualizar} />
      <SecaoEncerramento estado={estado} atualizar={atualizar} />
      <SecaoPlacar estado={estado} atualizar={atualizar} />
    </div>
  );
}
```

- [ ] **Step 8: Run to verify pass**

Run: `npm run test -- src/pages/PainelPage.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 9: Append painel layout CSS to `src/styles/identidade.css`**

```css
.painel {
  max-width: 760px;
  margin: 0 auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.painel__cabecalho {
  display: flex;
  align-items: center;
  gap: 12px;
}

.painel__logo {
  width: 44px;
  height: 44px;
  background: var(--laranja);
  color: var(--tinta);
  display: flex;
  align-items: center;
  justify-content: center;
  font: 600 32px/1 'Barlow Condensed', sans-serif;
}

.painel h1 {
  font: 600 30px/1 'Barlow Condensed', sans-serif;
  margin: 0;
}

.secao {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.secao h2 {
  font: 700 12px/1 'JetBrains Mono', monospace;
  letter-spacing: 0.16em;
  color: var(--laranja);
  margin: 0;
  text-transform: uppercase;
}

.secao input[type='text'],
.secao input:not([type]) {
  background: #2a2226;
  border: 2px solid #3a3136;
  color: var(--creme);
  font: 600 22px 'Barlow Condensed', sans-serif;
  padding: 8px 10px;
  width: 100%;
}

.secao input {
  background: #2a2226;
  border: 2px solid #3a3136;
  color: var(--creme);
  font: 600 22px 'Barlow Condensed', sans-serif;
  padding: 8px 10px;
}

.secao button {
  min-height: 44px;
  min-width: 44px;
  background: #2a2226;
  color: var(--creme);
  border: 0;
  padding: 12px 16px;
  font: 700 13px/1 'JetBrains Mono', monospace;
  letter-spacing: 0.1em;
}

.secao__botaoDestaque {
  background: var(--laranja) !important;
  color: var(--tinta) !important;
}

.secao__botaoSecundario {
  align-self: flex-start;
}

.secao__linha {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.secao__numero {
  width: 80px;
}

.secao__relogio {
  font: 600 26px/1 'Barlow Condensed', sans-serif;
  color: var(--laranja);
  font-variant-numeric: tabular-nums;
}

.secao__placarGrade {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto auto;
  gap: 8px;
  align-items: center;
}

.secao__golNumero {
  font: 600 34px/1 'Barlow Condensed', sans-serif;
  min-width: 40px;
  text-align: center;
}

.indicador-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.indicador-status__bolinha {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.indicador-status__editado {
  color: #8a7f84;
}
```

- [ ] **Step 10: Wire route into `src/App.tsx`** (wrap with `RotaProtegida`)

```tsx
import { Route, Routes } from 'react-router-dom';
import { OverlayPage } from './pages/OverlayPage';
import { LoginPage } from './pages/LoginPage';
import { PainelPage } from './pages/PainelPage';
import { RotaProtegida } from './components/RotaProtegida';

export default function App() {
  return (
    <Routes>
      <Route path="/overlay/:cena" element={<OverlayPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/painel"
        element={
          <RotaProtegida>
            <PainelPage />
          </RotaProtegida>
        }
      />
    </Routes>
  );
}
```

- [ ] **Step 11: Commit**

```bash
git add src/pages/PainelPage.tsx src/pages/PainelPage.test.tsx src/components/painel/IndicadorStatus.tsx src/components/painel/SecaoComecando.tsx src/components/painel/SecaoIntervalo.tsx src/components/painel/SecaoEncerramento.tsx src/components/painel/SecaoPlacar.tsx src/styles/identidade.css src/App.tsx
git commit -m "feat: painel com começando, intervalo, encerramento e placar"
```

---

### Task 13: `PainelPage` — câmeras, galera/no ar/nome na tela

**Files:**
- Create: `src/components/painel/SecaoCameras.tsx` (+`.test.tsx`), `src/components/painel/SecaoMembros.tsx` (+`.test.tsx`)
- Modify: `src/pages/PainelPage.tsx`

**Interfaces:**
- Consumes: `Estado`, `Membro` (Task 2).
- Produces: `<SecaoCameras estado atualizar />`, `<SecaoMembros estado atualizar />`, wired into `PainelPage`.

- [ ] **Step 1: Failing test — `SecaoCameras.test.tsx`**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SecaoCameras } from './SecaoCameras';
import { ESTADO_PADRAO } from '../../types/estado';

describe('SecaoCameras', () => {
  it('atualiza o nome da câmera 2 sem afetar as outras', () => {
    const atualizar = vi.fn();
    render(<SecaoCameras estado={ESTADO_PADRAO} atualizar={atualizar} />);
    const campos = screen.getAllByDisplayValue(/NOME 0[1-3]/);
    fireEvent.change(campos[1], { target: { value: 'JOÃO' } });
    expect(atualizar).toHaveBeenCalledWith({ cams: ['NOME 01', 'JOÃO', 'NOME 03'] });
  });
});
```

- [ ] **Step 2: Run to verify failure**, then implement `src/components/painel/SecaoCameras.tsx`:

```tsx
import { Estado } from '../../types/estado';

interface Props {
  estado: Estado;
  atualizar: (patch: Partial<Estado>) => void;
}

export function SecaoCameras({ estado, atualizar }: Props) {
  function mudarCam(i: number, valor: string) {
    const novasCams = [...estado.cams];
    novasCams[i] = valor;
    atualizar({ cams: novasCams });
  }

  return (
    <section className="secao">
      <h2>CÂMERAS DO REACT</h2>
      {[0, 1, 2].map((i) => (
        <div className="secao__linha" key={i}>
          <span className="secao__camLabel">CAM {i + 1}</span>
          <input value={estado.cams[i] || ''} onChange={(e) => mudarCam(i, e.target.value)} />
        </div>
      ))}
    </section>
  );
}
```

- [ ] **Step 3: Run to verify pass**.

- [ ] **Step 4: Failing test — `SecaoMembros.test.tsx`**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SecaoMembros } from './SecaoMembros';
import { ESTADO_PADRAO } from '../../types/estado';

describe('SecaoMembros', () => {
  it('alterna o membro 3 para "no ar"', () => {
    const atualizar = vi.fn();
    render(<SecaoMembros estado={ESTADO_PADRAO} atualizar={atualizar} />);
    const botoesNoAr = screen.getAllByText('NO AR');
    fireEvent.click(botoesNoAr[3]); // membro índice 3, ainda não estava no ar (noAr padrão é [0,1,2])
    expect(atualizar).toHaveBeenCalledWith({ noAr: [0, 1, 2, 3] });
  });

  it('mostra o lower third do membro clicado por ltSeg segundos', () => {
    const atualizar = vi.fn();
    render(<SecaoMembros estado={ESTADO_PADRAO} atualizar={atualizar} />);
    const botoesMostrar = screen.getAllByText('MOSTRAR');
    const antes = Date.now();
    fireEvent.click(botoesMostrar[2]);
    const chamada = atualizar.mock.calls[0][0];
    expect(chamada.lt).toBe(2);
    expect(chamada.ltAte).toBeGreaterThanOrEqual(antes + ESTADO_PADRAO.ltSeg * 1000);
  });

  it('esconde o nome atual', () => {
    const atualizar = vi.fn();
    render(<SecaoMembros estado={ESTADO_PADRAO} atualizar={atualizar} />);
    fireEvent.click(screen.getByText('ESCONDER NOME'));
    expect(atualizar).toHaveBeenCalledWith({ ltAte: 0 });
  });
});
```

- [ ] **Step 5: Run to verify failure**, then implement `src/components/painel/SecaoMembros.tsx`:

```tsx
import { Estado } from '../../types/estado';

interface Props {
  estado: Estado;
  atualizar: (patch: Partial<Estado>) => void;
}

export function SecaoMembros({ estado, atualizar }: Props) {
  function mudarNome(i: number, valor: string) {
    const membros = [...estado.membros];
    membros[i] = { ...membros[i], n: valor };
    atualizar({ membros });
  }

  function mudarFuncao(i: number, valor: string) {
    const membros = [...estado.membros];
    membros[i] = { ...membros[i], f: valor };
    atualizar({ membros });
  }

  function alternarNoAr(i: number) {
    const noAr = estado.noAr.includes(i) ? estado.noAr.filter((x) => x !== i) : [...estado.noAr, i];
    atualizar({ noAr });
  }

  function mostrarNaTela(i: number) {
    atualizar({ lt: i, ltAte: Date.now() + estado.ltSeg * 1000 });
  }

  return (
    <section className="secao">
      <div className="secao__cabecalhoLinha">
        <h2>GALERA · NO AR E NOME NA TELA</h2>
        <button className="secao__botaoSecundario" onClick={() => atualizar({ ltAte: 0 })}>
          ESCONDER NOME
        </button>
      </div>
      {estado.membros.map((m, i) => {
        const noAr = estado.noAr.includes(i);
        return (
          <div className="secao__membroLinha" key={i}>
            <input value={m.n} onChange={(e) => mudarNome(i, e.target.value)} />
            <input value={m.f} onChange={(e) => mudarFuncao(i, e.target.value)} />
            <button className={noAr ? 'secao__botaoDestaque' : ''} onClick={() => alternarNoAr(i)}>
              NO AR
            </button>
            <button className="secao__botaoVioleta" onClick={() => mostrarNaTela(i)}>
              MOSTRAR
            </button>
          </div>
        );
      })}
      <div className="secao__linha">
        <span>Nome fica na tela por</span>
        <input
          type="number"
          min={2}
          value={estado.ltSeg}
          onChange={(e) => atualizar({ ltSeg: Math.max(2, parseInt(e.target.value, 10) || 2) })}
          className="secao__numero"
        />
        <span>segundos</span>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Append small CSS additions to `src/styles/identidade.css`**

```css
.secao__cabecalhoLinha {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.secao__camLabel {
  font-size: 13px;
  width: 52px;
}

.secao__membroLinha {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto auto;
  gap: 6px;
  align-items: center;
}

.secao__botaoVioleta {
  border: 2px solid var(--violeta) !important;
}
```

- [ ] **Step 7: Run all painel tests to verify pass**

Run: `npm run test -- src/components/painel`
Expected: PASS (4 tests)

- [ ] **Step 8: Wire into `PainelPage.tsx`** — add imports and render below `SecaoPlacar`:

```tsx
import { SecaoCameras } from '../components/painel/SecaoCameras';
import { SecaoMembros } from '../components/painel/SecaoMembros';
// ...
<SecaoCameras estado={estado} atualizar={atualizar} />
<SecaoMembros estado={estado} atualizar={atualizar} />
```

- [ ] **Step 9: Commit**

```bash
git add src/components/painel/SecaoCameras.tsx src/components/painel/SecaoCameras.test.tsx src/components/painel/SecaoMembros.tsx src/components/painel/SecaoMembros.test.tsx src/pages/PainelPage.tsx src/styles/identidade.css
git commit -m "feat: painel — câmeras, galera no ar e lower third"
```

---

### Task 14: Donation alert — `disparar_evento` wiring + test button

**Files:**
- Create: `src/hooks/useEventos.ts`, `src/hooks/useEventos.test.ts`, `src/components/painel/SecaoAlerta.tsx` (+`.test.tsx`)
- Modify: `src/pages/OverlayPage.tsx`, `src/pages/PainelPage.tsx`

**Interfaces:**
- Consumes: `supabase.channel(...)`, `supabase.rpc('disparar_evento', ...)` (Task 4); `EventoAlerta` (Task 2); `Alerta` visual component (already built in Task 10).
- Produces: `useEventos(slug): { ultimoEvento: EventoAlerta | null; recebidoEm: number | null; disparar: (evento: EventoAlerta) => Promise<void> }`. Consumed by `OverlayPage` (to show `Alerta`) and `SecaoAlerta` (to trigger the test button).

- [ ] **Step 1: Failing test — `useEventos.test.ts`**

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEventos } from './useEventos';

function criarCanalFalso() {
  const canal = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(() => canal),
  };
  return canal;
}

vi.mock('../lib/supabase', () => ({
  supabase: { channel: vi.fn(() => criarCanalFalso()), removeChannel: vi.fn(), rpc: vi.fn() },
}));

import { supabase } from '../lib/supabase';

beforeEach(() => vi.clearAllMocks());

describe('useEventos', () => {
  it('atualiza ultimoEvento quando chega um INSERT de tipo doacao', () => {
    let handler: (payload: unknown) => void = () => {};
    vi.mocked(supabase.channel).mockReturnValue({
      on: vi.fn((_evento, _filtro, cb) => {
        handler = cb;
        return { subscribe: vi.fn().mockReturnThis() };
      }),
      subscribe: vi.fn().mockReturnThis(),
    } as never);

    const { result } = renderHook(() => useEventos('principal'));

    act(() => {
      handler({ new: { tipo: 'doacao', payload: { nome: 'FULANO', mensagem: 'Valeu, galera!' }, created_at: new Date().toISOString() } });
    });

    expect(result.current.ultimoEvento).toEqual({ nome: 'FULANO', mensagem: 'Valeu, galera!' });
  });

  it('dispara um evento via RPC', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never);
    const { result } = renderHook(() => useEventos('principal'));

    await act(async () => {
      await result.current.disparar({ nome: 'CICLANO', mensagem: 'Teste' });
    });

    expect(supabase.rpc).toHaveBeenCalledWith('disparar_evento', {
      p_slug: 'principal',
      p_tipo: 'doacao',
      p_payload: { nome: 'CICLANO', mensagem: 'Teste' },
    });
  });
});
```

- [ ] **Step 2: Run to verify failure**, then implement `src/hooks/useEventos.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { EventoAlerta } from '../types/estado';

interface LinhaEvento {
  tipo: string;
  payload: EventoAlerta;
  created_at: string;
}

export function useEventos(slug: string) {
  const [ultimoEvento, setUltimoEvento] = useState<EventoAlerta | null>(null);
  const [recebidoEm, setRecebidoEm] = useState<number | null>(null);

  useEffect(() => {
    const canal = supabase
      .channel(`eventos-${slug}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'eventos' }, (payload: { new: LinhaEvento }) => {
        if (payload.new.tipo !== 'doacao') return;
        setUltimoEvento(payload.new.payload);
        setRecebidoEm(Date.now());
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [slug]);

  const disparar = useCallback(
    async (evento: EventoAlerta) => {
      await supabase.rpc('disparar_evento', { p_slug: slug, p_tipo: 'doacao', p_payload: evento });
    },
    [slug],
  );

  return { ultimoEvento, recebidoEm, disparar };
}
```

- [ ] **Step 3: Run to verify pass**

Run: `npm run test -- src/hooks/useEventos.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 4: Failing test — `SecaoAlerta.test.tsx`**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { SecaoAlerta } from './SecaoAlerta';

describe('SecaoAlerta', () => {
  it('dispara um evento de teste ao clicar no botão', () => {
    const disparar = vi.fn();
    render(<SecaoAlerta disparar={disparar} />);
    fireEvent.click(screen.getByText('DISPARAR ALERTA DE TESTE'));
    expect(disparar).toHaveBeenCalledWith({ nome: 'TESTE', mensagem: 'Isso é só um teste do alerta 🎉' });
  });
});
```

- [ ] **Step 5: Run to verify failure**, then implement `src/components/painel/SecaoAlerta.tsx`:

```tsx
import { EventoAlerta } from '../../types/estado';

interface Props {
  disparar: (evento: EventoAlerta) => void;
}

export function SecaoAlerta({ disparar }: Props) {
  return (
    <section className="secao">
      <h2>ALERTA DE DOAÇÃO</h2>
      <p>As doações reais chegam pela plataforma de pix/doação de vocês. Este botão só testa a animação na tela.</p>
      <button onClick={() => disparar({ nome: 'TESTE', mensagem: 'Isso é só um teste do alerta 🎉' })}>DISPARAR ALERTA DE TESTE</button>
    </section>
  );
}
```

- [ ] **Step 6: Wire into `PainelPage.tsx`**

```tsx
import { useEventos } from '../hooks/useEventos';
import { SecaoAlerta } from '../components/painel/SecaoAlerta';
// dentro do componente:
const { disparar } = useEventos(slug);
// no JSX, após SecaoMembros:
<SecaoAlerta disparar={disparar} />
```

- [ ] **Step 7: Wire display into `OverlayPage.tsx`** — replace the Task 10 placeholder wiring for the `alerta` scene:

```tsx
import { useEventos } from '../hooks/useEventos';
// dentro do componente, junto às outras chamadas de hook:
const { ultimoEvento, recebidoEm } = useEventos(slug);
const alertaVisivel = !!recebidoEm && agoraServidor - recebidoEm < 8000;
// troca a linha do placeholder por:
{cena === 'alerta' && <Alerta visivel={alertaVisivel} nome={ultimoEvento?.nome ?? ''} mensagem={ultimoEvento?.mensagem ?? ''} />}
```

- [ ] **Step 8: Run full test suite**

Run: `npm run test`
Expected: PASS (all tests so far)

- [ ] **Step 9: Commit**

```bash
git add src/hooks/useEventos.ts src/hooks/useEventos.test.ts src/components/painel/SecaoAlerta.tsx src/components/painel/SecaoAlerta.test.tsx src/pages/PainelPage.tsx src/pages/OverlayPage.tsx
git commit -m "feat: alerta de doação (evento realtime + botão de teste)"
```

---

### Task 15: `AdminPage` — invite by email, list roles

**Files:**
- Create: `src/pages/AdminPage.tsx`, `src/pages/AdminPage.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `supabase.from('membros_equipe')...` (Task 3, RLS already restricts writes to admins).
- Produces: route `/admin`, gated by `RotaProtegida` + an in-page check that `papel === 'admin'`.

- [ ] **Step 1: Failing test — `AdminPage.test.tsx`**

```tsx
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminPage } from './AdminPage';

vi.mock('../lib/supabase', () => {
  const order = vi.fn().mockResolvedValue({ data: [{ id: '1', email: 'a@a.com', nome: 'A', papel: 'admin', user_id: 'u1' }], error: null });
  const select = vi.fn(() => ({ order }));
  const insert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn(() => ({ select, insert }));
  return { supabase: { from } };
});

import { supabase } from '../lib/supabase';

beforeEach(() => vi.clearAllMocks());

describe('AdminPage', () => {
  it('lista os membros existentes', async () => {
    render(<AdminPage />);
    await waitFor(() => expect(screen.getByText('a@a.com')).toBeInTheDocument());
  });

  it('convida um novo membro por e-mail', async () => {
    render(<AdminPage />);
    await waitFor(() => expect(screen.getByText('a@a.com')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText('email@exemplo.com'), { target: { value: 'novo@a.com' } });
    fireEvent.click(screen.getByText('CONVIDAR'));

    await waitFor(() => expect(supabase.from).toHaveBeenCalledWith('membros_equipe'));
    expect(vi.mocked(supabase.from).mock.results[1].value.insert).toHaveBeenCalledWith({ email: 'novo@a.com', papel: 'editor' });
  });
});
```

- [ ] **Step 2: Run to verify failure**, then implement `src/pages/AdminPage.tsx`:

```tsx
import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface MembroEquipe {
  id: string;
  email: string;
  nome: string | null;
  papel: 'admin' | 'editor';
  user_id: string | null;
}

export function AdminPage() {
  const [membros, setMembros] = useState<MembroEquipe[]>([]);
  const [email, setEmail] = useState('');
  const [papel, setPapel] = useState<'admin' | 'editor'>('editor');
  const [erro, setErro] = useState('');

  async function carregar() {
    const { data, error } = await supabase.from('membros_equipe').select('id, email, nome, papel, user_id').order('created_at');
    if (!error && data) setMembros(data as MembroEquipe[]);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function convidar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    const { error } = await supabase.from('membros_equipe').insert({ email, papel });
    if (error) setErro('Não deu pra convidar. Confere se o e-mail já não está cadastrado.');
    else {
      setEmail('');
      await carregar();
    }
  }

  return (
    <div className="painel">
      <h1>ADMIN · EQUIPE</h1>
      <form onSubmit={convidar} className="secao secao__linha">
        <input placeholder="email@exemplo.com" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <select value={papel} onChange={(e) => setPapel(e.target.value as 'admin' | 'editor')}>
          <option value="editor">EDITOR</option>
          <option value="admin">ADMIN</option>
        </select>
        <button type="submit">CONVIDAR</button>
      </form>
      {erro && <p>{erro}</p>}
      <ul className="admin-lista">
        {membros.map((m) => (
          <li key={m.id}>
            {m.email} — {m.papel} {!m.user_id && '(aguardando primeiro login)'}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Run to verify pass**

Run: `npm run test -- src/pages/AdminPage.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 4: Wire route into `src/App.tsx`**

```tsx
import { AdminPage } from './pages/AdminPage';
// ...
<Route
  path="/admin"
  element={
    <RotaProtegida>
      <AdminPage />
    </RotaProtegida>
  }
/>
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/AdminPage.tsx src/pages/AdminPage.test.tsx src/App.tsx
git commit -m "feat: painel admin para convidar membros e definir papel"
```

---

### Task 16: `PreviewPage`

**Files:**
- Create: `src/pages/PreviewPage.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: all overlay scene components (Tasks 8–10), `useSala`, `useServerClock`.
- Produces: route `/preview` showing all 7 scenes scaled down in a grid, no login required (useful to sanity-check before going live).

- [ ] **Step 1: Implement `src/pages/PreviewPage.tsx`** (no TDD here — this is a thin composition of already-tested pieces; verify visually per Step 2)

```tsx
import { useSearchParams } from 'react-router-dom';
import { useSala } from '../hooks/useSala';
import { useServerClock } from '../hooks/useServerClock';
import { calcularRestante } from '../lib/tempo';
import { Cena } from '../types/estado';
import { Comecando } from '../components/overlay/Comecando';
import { Intervalo } from '../components/overlay/Intervalo';
import { Encerramento } from '../components/overlay/Encerramento';
import { Jogo } from '../components/overlay/Jogo';
import { ReactCameras } from '../components/overlay/ReactCameras';
import { Nome } from '../components/overlay/Nome';
import { Alerta } from '../components/overlay/Alerta';

const CENAS: { chave: Cena; label: string }[] = [
  { chave: 'comecando', label: 'Começando' },
  { chave: 'intervalo', label: 'Intervalo' },
  { chave: 'encerramento', label: 'Encerramento' },
  { chave: 'jogo', label: 'Jogo + placar' },
  { chave: 'react', label: 'React / câmeras' },
  { chave: 'nome', label: 'Nome (lower third)' },
  { chave: 'alerta', label: 'Alerta de doação' },
];

export function PreviewPage() {
  const [params] = useSearchParams();
  const slug = params.get('sala') || 'principal';
  const { estado } = useSala(slug);
  const agoraServidor = useServerClock();
  const restanteMs = calcularRestante(estado, agoraServidor);
  const origem = window.location.origin;

  return (
    <div className="preview">
      <h1>OBS · UNIDADE SECRETA</h1>
      <div className="preview__grade">
        {CENAS.map(({ chave, label }) => (
          <div className="preview__item" key={chave}>
            <div className="preview__label">{label.toUpperCase()}</div>
            <div className="preview__palcoMini">
              <div className="palco">
                {chave === 'comecando' && <Comecando estado={estado} restanteMs={restanteMs} />}
                {chave === 'intervalo' && <Intervalo estado={estado} />}
                {chave === 'encerramento' && <Encerramento estado={estado} />}
                {chave === 'jogo' && <Jogo estado={estado} />}
                {chave === 'react' && <ReactCameras estado={estado} />}
                {chave === 'nome' && <Nome estado={estado} agoraServidor={agoraServidor} />}
                {chave === 'alerta' && <Alerta visivel nome="EXEMPLO" mensagem="Prévia do alerta" />}
              </div>
            </div>
            <div className="preview__url">{`${origem}/overlay/${chave}?sala=${slug}`}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Append preview CSS to `src/styles/identidade.css`**

```css
.preview {
  padding: 24px;
  max-width: 1600px;
  margin: 0 auto;
}

.preview__grade {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 24px;
}

.preview__label {
  font: 700 13px/1 'JetBrains Mono', monospace;
  letter-spacing: 0.1em;
  color: var(--laranja);
  margin-bottom: 8px;
}

.preview__palcoMini {
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  position: relative;
  background: #241d21;
}

.preview__palcoMini .palco {
  width: 1920px;
  height: 1080px;
  transform: scale(0.1875);
  transform-origin: 0 0;
}

.preview__url {
  font-size: 11px;
  color: #8a7f84;
  word-break: break-all;
  margin-top: 6px;
}
```

Note: `transform: scale(.1875)` assumes a 360px-wide container (360/1920); this is an approximation good enough for a sanity-check preview — pixel-perfect scaling isn't a requirement for this route.

- [ ] **Step 3: Wire route into `src/App.tsx`**

```tsx
import { PreviewPage } from './pages/PreviewPage';
// ...
<Route path="/preview" element={<PreviewPage />} />
```

- [ ] **Step 4: Manual check** — `npm run dev`, open `/preview`, confirm all 7 scenes render without throwing and the URLs shown are correct.

- [ ] **Step 5: Commit**

```bash
git add src/pages/PreviewPage.tsx src/styles/identidade.css src/App.tsx
git commit -m "feat: rota /preview com grade das cenas"
```

---

### Task 17: Deploy guide and final README

**Files:**
- Modify: `README.md`

**Interfaces:**
- N/A — documentation only. This is the final manual-verification pass: an admin (the user) follows this guide against a real Supabase + Vercel project and confirms Tasks 1–16 actually work end-to-end, since nothing before this task ran against real infrastructure.

- [ ] **Step 1: Rewrite `README.md`** with the full guide (Portuguese), including:

```md
# Unidade Secreta Live

Painel web para controlar os overlays de OBS da Unidade Secreta em tempo real, de qualquer lugar, de graça.

## Como funciona

- `/overlay/:cena?sala=principal` — as cenas (comecando, intervalo, encerramento, jogo, react, nome, alerta). É a URL que entra no Browser Source do OBS.
- `/painel` — onde a galera edita tudo pelo celular (precisa de login).
- `/preview` — grade com todas as cenas em miniatura, pra conferir.
- `/admin` — convidar gente nova e definir o papel (admin/editor).

## 1. Criar o projeto no Supabase

1. Crie uma conta grátis em supabase.com e um novo projeto.
2. Em SQL Editor, rode nesta ordem os arquivos de `supabase/migrations/`: `0001_schema.sql`, `0002_funcoes.sql`, `0003_realtime.sql`.
3. Em Authentication → Providers, confirme que "Email" está habilitado (magic link já vem ligado por padrão).
4. Em Authentication → URL Configuration, adicione a URL do seu deploy na Vercel (passo 3) em "Redirect URLs".
5. Em Project Settings → API, copie a "Project URL" e a "anon public key".

## 2. Virar admin pela primeira vez

Antes de existir alguém no `/admin`, você precisa se cadastrar manualmente como o primeiro admin. No SQL Editor do Supabase:

\`\`\`sql
insert into public.membros_equipe (email, nome, papel) values ('seu-email@exemplo.com', 'SEU NOME', 'admin');
\`\`\`

Depois, faça login normalmente pelo `/login` do site com esse e-mail — o vínculo com sua conta acontece automaticamente no primeiro login.

## 3. Subir no GitHub e importar na Vercel

1. \`git remote add origin <url-do-seu-repo>\` e \`git push -u origin main\`.
2. Em vercel.com, "Add New Project", importe o repositório.
3. Em Environment Variables, adicione \`VITE_SUPABASE_URL\` e \`VITE_SUPABASE_ANON_KEY\` (os valores copiados no passo 1.5).
4. Deploy. Anote a URL gerada (ex: \`https://unidade-secreta-live.vercel.app\`).
5. Volte no Supabase (passo 1.4) e confirme essa URL está nas Redirect URLs.

## 4. Configurar no OBS

1. Crie uma cena para cada tela e adicione uma fonte **Navegador**.
2. URL: \`https://SEU-DOMINIO.vercel.app/overlay/CENA?sala=principal\` (troque CENA por comecando, intervalo, encerramento, jogo, react, nome ou alerta).
3. Largura 1920, altura 1080. Marque "Atualizar navegador quando a cena ficar ativa".
4. No painel do OBS: Docks → Docks de navegador personalizados → cole a URL \`https://SEU-DOMINIO.vercel.app/painel\` — assim dá pra editar sem sair do OBS.

## 5. Convidar o resto da galera

Em \`/admin\`, cadastre o e-mail e o papel (editor ou admin) de cada um. Assim que a pessoa fizer login pelo \`/login\` com aquele e-mail, o acesso já libera.

## Desenvolvimento local

\`\`\`bash
npm install
cp .env.example .env.local # preencha com as chaves do seu projeto Supabase
npm run dev
\`\`\`

## Testes

\`\`\`bash
npm run test
\`\`\`
```

- [ ] **Step 2: Manual end-to-end verification** (do this against a real free-tier Supabase project + Vercel deploy):
  - Confirm `/login` sends a real magic link and the redirect lands on `/painel`.
  - Confirm editing any field in `/painel` updates `/overlay/jogo?sala=principal` open in a second tab within ~1s.
  - Confirm reloading `/overlay/comecando?sala=principal` mid-countdown shows the cached last-known state immediately (no flash to defaults) before Realtime reconnects.
  - Confirm the "DISPARAR ALERTA DE TESTE" button makes `/overlay/alerta?sala=principal` show and then hide the alert.
  - Confirm `/admin` invite + first login binds the new member and they can edit `/painel`.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: guia completo de deploy (supabase, vercel, obs)"
```

---

## Self-Review Notes

- **Spec coverage:** every "Entrega" (1–7) from `PROMPT-CLAUDE-CODE.md` maps to a task range: (1) Task 1, (2) Tasks 3–4, (3) Tasks 7–9, (4) Tasks 5–6+10, (5) Tasks 11–13, (6) Task 14, (7) Task 17. `/preview` (Task 16) and `/admin` (Task 15) from the "Rotas" section are covered. Visual identity constraints are locked into Task 7's CSS. Server-clock sync is Task 5. No-flicker caching is in Task 6's `useSala`. Optimistic updates are in Task 6 and exercised by Task 12's tests.
- **Type consistency check:** `Estado`/`Membro`/`Cena`/`EventoAlerta` (Task 2) are the only shapes referenced by every later hook/component — verified `useSala`, `OverlayPage`, `PainelPage`, and all `Secao*`/scene components import from `../types/estado` and use the same field names (`titulo`, `golsA`, `noAr`, `cams`, `lt`, `ltAte`, `ltSeg`, etc.) throughout, matching the RPC's jsonb merge shape in Task 4.
- **No placeholders:** every step above has real, runnable code — the only intentionally-deferred item is the real end-to-end network verification (Task 17, Step 2), which requires infrastructure that doesn't exist until a human creates a Supabase project, and is called out explicitly as manual rather than left vague.
