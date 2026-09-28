# unidade-secreta-live — estado do projeto

Painel web (Vite+React+TS+Supabase) para controlar overlays de OBS em tempo real. Spec original em `PROMPT-CLAUDE-CODE.md`. Referência visual em `referencia/`.

## Onde paramos (2026-09-26, ~02:08)

Todas as **17 tarefas do plano estão implementadas, testadas e commitadas** em `main`:
`docs/superpowers/plans/2026-09-26-unidade-secreta-live.md`

A **revisão final do branch inteiro já rodou** (modelo Opus, que chegou a subir um container Postgres real e rodar as migrations + uma bateria de testes de RLS/RPC — a primeira vez que qualquer SQL do projeto foi de fato executado, já que os 42 testes automatizados mockam o Supabase).

**Resultado: NÃO está pronto pra merge/deploy ainda.** Achou 1 bug **crítico** real e 7 **importantes**. Relatório completo salvo em:
`.superpowers/sdd/2026-09-26-unidade-secreta-live/final-review-report.md`

Ledger da execução (histórico de todas as 17 tarefas, revisões, rulings): `.superpowers/sdd/2026-09-26-unidade-secreta-live/progress.md`

### O bug crítico (resumo)

As políticas de RLS da tabela `membros_equipe` (`supabase/migrations/0001_schema.sql:42-60`) são autorreferentes — cada policy faz `select ... from membros_equipe` dentro de uma policy *da própria tabela* `membros_equipe`. Isso causa `infinite recursion detected in policy` no Postgres real. Consequência: **`/painel` e `/admin` ficam inutilizáveis para todo mundo, inclusive o admin inicial** — `useAuth` engole o erro silenciosamente e todo mundo cai na tela "conta ainda não liberada".

Correção (já com o SQL pronto no relatório): criar uma função `SECURITY DEFINER` (`papel_atual()`) e reescrever as 4 policies pra chamá-la em vez de consultar `membros_equipe` de dentro da própria policy.

### Os 7 importantes (resumo, detalhes no relatório)

2. Fundo do overlay não é transparente de verdade sem depender do CSS customizado do próprio OBS.
3. `SecaoComecando`/`SecaoMembros` escrevem `fim`/`ltAte` com `Date.now()` do cliente, mas a leitura usa o relógio do servidor (`agoraServidor`) — viola a própria regra do plano.
4. `useEventos` guarda `recebidoEm` no relógio local, mas `OverlayPage` compara com `agoraServidor` — mistura relógios, a janela do alerta quebra com dessincronia.
5. `useSala` dispara um RPC por tecla digitada, sem debounce, e aceita o eco do realtime sem checar se foi o próprio autor — digitação rápida pode se autodestruir.
6. Quem loga antes de ser convidado nunca vincula (`user_id` fica NULL pra sempre) — o trigger só dispara em `INSERT` de `auth.users`.
7. `useEventos` escuta TODOS os eventos de doação, não filtra por sala — inofensivo com uma sala só, mas `?sala=` já é recurso lançado.
8. Falta `vercel.json` com rewrite de SPA (risco de 404 em links profundos como `/overlay/jogo`).

Há também 11 achados **menores**, não bloqueantes, listados no relatório (itens #9–19).

## Atualização 2026-09-28

- Usuário refez as telas: cenas ficaram ok, **o painel está sendo refeito pelo usuário** (novos arquivos vão para `referencia/`; até 18:30 os arquivos lá ainda eram os antigos, idênticos ao commit).
- Login consertado (não commitado ainda): `supabase/migrations/0004_corrige_login.sql` resolve o Crítico #1 (`papel_atual()` SECURITY DEFINER), o #6 (vincular conta existente ao convidar, e-mail sem diferenciar maiúsculas, backfill) e o menor #9 (nome nulo). Testado em Postgres 17 real com stub do schema auth. `useAuth` expõe `erro` (maybeSingle), `RotaProtegida` mostra o erro. `vercel.json` (#8) e README atualizados.
- Pendentes da revisão: #2 (fundo transparente, junto do redesign), #3, #4, #5, #7. O plano de rodada única do SDD abaixo foi substituído por esse trabalho incremental, a pedido do usuário.

## Atualização 2026-09-28 (noite)

- Supabase criado (projeto `yupmxwirknqrdssyievb`, região us-east-1), migrations 0001–0004 rodadas, `.env.local` configurado com URL + publishable key.
- Login trocado de magic link para **e-mail + senha**, tela refeita a partir de `referencia/login.html`. **Sem tela de cadastro** (decisão do usuário): contas são criadas pelo admin no Supabase (Users → Add user, Auto Confirm) + cadastro em `/admin`. Signup deve ficar desligado no Supabase.
- Admin inicial `unidadesecretarp@gmail.com` (Administrador) criado e testado — login funcionando.
- "Lembrar neste PC" usa storage customizado em `src/lib/supabase.ts` (localStorage vs sessionStorage).
- Próximo: usuário vai mandar o novo painel em `referencia/`. Nada disso foi commitado ainda.

## Telas novas (2026-09-28, ~19:30) — ONDE PARAMOS

Usuário mandou `TELAS-NOVAS.md` + referências novas em `referencia/`. Dividido em 3 partes: **1) estado + PIX manual + 9 telas + /alerta + painel**, 2) LivePix, 3) chat Social Stream Ninja.

- Backup do estado anterior: branch `antes-telas-novas`.
- Parte 1: design aprovado pelo usuário, **spec e plano escritos, nada implementado ainda** (usuário teve que sair):
  - Spec: `docs/superpowers/specs/2026-09-28-telas-novas-parte-1-design.md` (tem todas as decisões tomadas com ele)
  - Plano: `docs/superpowers/plans/2026-09-28-telas-novas-parte-1.md` (14 tarefas)
- **Próximo passo ao retomar:** executar o plano direto, em ordem, commit por tarefa. O usuário pediu para NÃO apresentar mais seções/plano nem fazer rodada de perguntas: só parar se algo bloquear ou mudar o visual. No fim, mandar a lista de URLs, print do /alerta e prints das 9 telas lado a lado com a referência (mesmos dados nas duas). Partes 2 e 3 seguem no mesmo ritmo, só resumo no final.
- A migration 0005 só vai para o Supabase de produção na Task 14, com OK do usuário.

## Próximo passo ao retomar (plano antigo, antes do redesign — SUBSTITUÍDO pelas telas novas)

Estava no meio do fluxo `superpowers:subagent-driven-development`. Regra da skill: correção final é **UMA única rodada** — um subagente implementador recebendo a lista completa de achados (não um por achado), depois **uma** re-revisão focada, depois eu decido o que fica pendente ("parked") vs. o que precisa de nova rodada.

1. Reler `.superpowers/sdd/2026-09-26-unidade-secreta-live/final-review-report.md` e `progress.md`.
2. Disparar UM subagente implementador com o Crítico #1 + Importantes #2–8 (8 achados) como lista de correções. `FIX_BASE` = `d7ce3b05b803177e49315a4082baa4c524b22b42` (HEAD atual, não mudou desde a revisão).
3. Depois do commit de correção: gerar o pacote de revisão (`scripts/review-package PLAN_FILE d7ce3b0... HEAD`) e disparar UMA re-revisão escopada (`re-review-prompt.md`) cobrindo os 8 achados.
4. Julgar qualquer achado residual (arquivar com decisão registrada, ou resolver se for bloqueante).
5. Seguir para `superpowers:finishing-a-development-branch`.
6. Os itens menores (#9–19) não entram nessa rodada de correção — ficam para o usuário decidir nas opções finais.

## Decisões já tomadas nesta sessão (não perguntar de novo)

- Projeto vive na raiz deste repo (não em subpasta) — já era um repo git vazio quando começamos.
- Trabalhando direto no `main`, sem worktree — usuário deu consentimento explícito (repo não tinha nenhum commit ainda).
- Alerta de doação é só um botão de teste manual (nome+mensagem) — doações reais vêm de plataforma externa (tipo pix.gg), sem integração de pagamento no projeto.
- Bootstrap do primeiro admin: passo manual de SQL no guia final (README), sem seed automático com e-mail fixo.
- Execução do plano via subagentes: um implementador + um revisor por tarefa, revisão final de branch inteiro no fim (já rodada, ver acima).
