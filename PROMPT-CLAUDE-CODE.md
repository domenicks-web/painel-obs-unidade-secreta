# Prompt para o Claude Code — Painel Global Unidade Secreta

Cole tudo abaixo da linha no Claude Code, dentro de uma pasta vazia. Antes, copie para essa pasta: `OBS-Cenas.dc.html`, `OBS-Painel.dc.html` e `support.js` (ficam em `referencia/`).

---

Você vai criar do zero o projeto **unidade-secreta-live**: um painel web global para controlar overlays de OBS em tempo real. Fale comigo em português.

## Contexto
- Unidade Secreta é um canal de YouTube de ~14 amigos (games, watch-along de futebol, react).
- Já existem 6 cenas de overlay em HTML (1920×1080, fundo transparente) e um painel local em `referencia/`. Hoje elas sincronizam via `localStorage` + `BroadcastChannel` (chave `us-obs`), então só funcionam no mesmo PC.
- Objetivo: qualquer um dos 14 edita pelo celular, de qualquer lugar, e o OBS de quem está transmitindo atualiza na hora.
- Restrição: **100% gratuito** (hospedagem + banco), sem servidor para manter.

## Stack
- **Vite + React + TypeScript** (SPA), React Router.
- **Supabase** (free tier): Postgres, Auth (magic link por e-mail) e **Realtime** (postgres_changes).
- **Vercel** (free) para deploy, conectado ao GitHub.
- Sem Tailwind obrigatório; CSS modules ou estilos simples. Nada de biblioteca de UI pesada.

## Identidade visual (usar exatamente)
- Laranja `#FF6B1F` (ação/destaque), Tinta `#1A1417` (fundo), Creme `#FFF3E0` (texto), Violeta (acento secundário — pegar o valor em `referencia/OBS-Cenas.dc.html`).
- Estética street, blocos sólidos, cantos retos, texto em caixa alta nos rótulos.
- Logo "US" em bloco com dez pontos simbólicos (5×2). Copiar fontes e detalhes das cenas de referência.

## Modelo de dados
Estado atual (portar 1:1):
```js
{titulo:'RESENHA AO VIVO', minutos:5, fim:0, msg:'VOLTAMOS JÁ', proximo:'SEXTA, 21H',
 timeA:'CASA', timeB:'FORA', golsA:0, golsB:0, jogo:'AO VIVO',
 membros:[{n:'NOME 01', f:'UNIDADE SECRETA'}, ...10], noAr:[0,1,2],
 cams:['NOME 01','NOME 02','NOME 03'], lt:-1, ltAte:0, ltSeg:6}
```
- `fim` e `ltAte` são timestamps (ms). Contagem regressiva e lower third dependem do relógio: usar `now` do servidor quando possível para não dessincronizar entre aparelhos.

Tabelas:
- `salas` (id, slug, nome, estado jsonb, updated_at, updated_by) — uma sala por transmissão; começar com a sala `principal`.
- `membros_equipe` (user_id, nome, papel: 'admin' | 'editor').
- `eventos` (id, sala_id, tipo, payload jsonb, created_at) — para alertas (ex.: doação), consumidos pela cena de alerta.
- RLS: leitura pública da `salas.estado` (o OBS não loga); escrita só para usuários em `membros_equipe`.
- Ativar Realtime em `salas` e `eventos`.
- Updates parciais: mesclar no jsonb (função RPC `atualizar_estado(slug, patch jsonb)`) para dois editores não se sobrescreverem.

## Rotas
- `/overlay/:cena?sala=principal` — as 6 cenas (comecando, intervalo, encerramento, jogo, react, nome) + `alerta`. Fundo transparente, 1920×1080 fixo, sem UI. Assina Realtime e re-renderiza. É a URL que vai no Browser Source do OBS.
- `/painel` — painel mobile-first (login obrigatório). Mesmos controles do `OBS-Painel.dc.html`: título, timer (iniciar/pausar/zerar), mensagem do intervalo, próximo episódio, placar (+/−), quem está no ar, câmeras, disparar lower third.
- `/preview` — grade com as cenas em escala para conferir.
- `/admin` — convidar membros por e-mail e definir papel.

## Requisitos
- Botões grandes (mín. 44px), uso com uma mão, feedback imediato (optimistic update) e indicador "ao vivo / reconectando".
- Mostrar "editado por X há Ys" no painel.
- Overlays não podem piscar ao reconectar; manter último estado em cache.
- Portar as animações das cenas de referência fielmente (lower third deslizando, contagem, loop do intervalo).

## Entregas, nesta ordem
1. `git init`, estrutura do projeto, README em português, `.env.example` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
2. `supabase/migrations/*.sql` com tabelas, RLS, RPC e Realtime.
3. Overlays portados e funcionando com dados mockados.
4. Integração Supabase (leitura + Realtime nos overlays).
5. Painel com login e escrita.
6. Cena de alerta de doação + botão de teste no painel.
7. Guia passo a passo: criar projeto Supabase, rodar migrations, subir no GitHub, importar na Vercel, colar URLs no OBS.

Antes de codar, leia os arquivos em `referencia/`, me mostre o plano e as dúvidas. Faça commits pequenos por etapa.
