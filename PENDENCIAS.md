# Pendências

> **2026-10-09: nada pendente.** O usuário conferiu tudo: cena ESCALAÇÃO no OBS, elencos de verdade, testes numa live (chat, gol, relógio, lances), PIX real somando na meta e tocando na live, ALERTA_CHAVE e senha do admin trocadas, kit OBS feito. O resto do arquivo fica como histórico das decisões.

## ESCALAÇÃO — no ar desde 2026-10-02 (0012 rodada, merge feito)

Passos 1 e 2 feitos (conferido: 4 times × 11 jogadores em produção, telas sem erro). Falta o passo 3 (OBS). Histórico:

1. Rodar a 0012 em produção. Pelo SQL Editor do Supabase (projeto `yupmxwirknqrdssyievb`): colar o conteúdo
   inteiro de `supabase/migrations/0012_times.sql` e clicar **Run**. Ou pelo terminal, com a connection string
   (Project Settings → Database):
   `psql "postgresql://postgres:SENHA@db.yupmxwirknqrdssyievb.supabase.co:5432/postgres" -v ON_ERROR_STOP=1 -f supabase/migrations/0012_times.sql`
   Conferir depois: `select nome, (select count(*) from jogadores j where j.time_id = t.id) from times t;` → 4 times, 11 cada.
2. Merge: `git checkout main && git merge --ff-only escalacao && git push` (deploy automático na Vercel).
3. OBS: cena nova **ESCALAÇÃO** com fonte Navegador 1920×1080 em
   `https://painel-obs-unidade-secreta.vercel.app/tela/escalacao` (mesmas opções das outras: desmarcar
   "Desligar fonte quando não visível" e "Atualizar ao ativar cena"). Por cima dela, as mesmas fontes da cena
   FUTEBOL: câmeras (encaixar nas molduras), chat 440×800 em x=1420 y=150, e `/gol` no topo se quiser a animação.

A 0012 só cria tabelas e funções novas: não mexe em `salas` nem em nada que as telas de hoje usam. As telas
atuais não leem `times`. Dá pra rodar antes da live sem risco, e o merge pode ficar pra depois.

**O que foi feito**
- `/tela/escalacao`: LISTA e CAMPO, só casa / casa e visitante / só visitante, 2–6 câmeras. Placar (com o pulo
  do gol), relógio, chat e letreiro são os componentes do FUTEBOL (`PlacarFutebol`, `ChatFutebol`, `FaixaTicker`).
  Lógica portada da referência em `src/escalacao/layout.ts` (FORMACOES, linhas, camsLista, camsCampo, posições).
- Painel → tela ESCALAÇÃO: LISTA|CAMPO, times, time e formação de cada lado em uso (22 formações), câmeras 2–6
  (botões; o editor de molduras de sempre funciona por cima), EDITAR POSIÇÕES (arrasta as bolinhas na prévia),
  RESETAR FORMAÇÃO. Botão TIMES no topo (e CADASTRO DE TIMES nos campos).
- Cadastro de times (modal TIMES): criar/editar/excluir, técnico, elenco com número/nome, titular/reserva,
  reordenar arrastando (ou ↑↓), contador 9/11, COLAR ELENCO. Grava o time inteiro no SALVAR (`salvar_time`).
- Banco 0012: `times`, `jogadores` (cascade), leitura pública, escrita só da equipe via `salvar_time`/`excluir_time`
  (anon sem EXECUTE), Realtime nas duas. Seed: BRASIL, CORINTHIANS, PALMEIRAS (**elencos de exemplo** da
  referência, editar antes de usar) e ÍNDIA (JOGADOR 1…11, técnico A DEFINIR).
- Testes: 316 → 448 (formações somam 10, linhas, câmeras dentro do palco/fora do chat e do letreiro em todos os
  casos, bolinhas dentro do campo inclusive manuais nos limites, espelhamento, 11 titulares, painel e modal).
  SQL: `supabase/testes/0012.sql`. Prints: `docs/prints/escalacao-lado-a-lado.png` (8 casos × referência,
  `scripts/comparar-escalacao.mjs`), `painel-escalacao-{lista,campo,celular}.png`, `painel-times{,-celular}.png`.

**Decisões tomadas sozinho (dá pra mudar)**
- Chat da escalação = o do FUTEBOL (440×800, y=150), não o 440×910 da referência (pedido de 29/09 vale).
- Câmeras sempre 16:9 (regra do projeto): mesma distribuição da referência, mas a caixa encaixa em 16:9
  (na referência elas ficam mais quadradas). Ex.: lista só casa com 4 câmeras = 432×243.
- Ziguezague: ±48 px com 1 time e ±34 com 2 (o `ESCALACAO.md`; a referência usava 46). As alas vão pra frente
  e o resto alterna a partir delas (em linha de 6, os dois do meio também vão pra frente).
- Visitante com os dois times em campo gira 180° (x e y): o lateral direito dele fica em cima, como num campo
  de verdade. Na referência só o x era espelhado, então a ordem de cima pra baixo do visitante muda um pouco.
- Posições manuais: 0–1 no campo inteiro, de quem ataca pra direita; com 2 times cada um usa a sua metade
  (mesmo encolhimento do automático). A bolinha e o nome embaixo não saem do campo.
- Trocar modo, times ou quantidade de câmeras volta as câmeras da escalação pro automático (`camsEscalacao: null`).
- **Time é texto livre** (pedido do usuário, 2026-10-02): o campo TIME CASA/VISITANTE é o próprio nome do placar
  (`timeA`/`timeB`). Se o nome bater com um time cadastrado (sem ligar pra acento/maiúscula), a escalação usa o
  elenco dele; se não, mostra só o nome e o painel oferece "+ CADASTRAR ELENCO" já com o nome preenchido.
  Os cadastrados aparecem só como sugestão enquanto digita.
- Cadastro de times é um modal (botão TIMES no topo, como GALERA), não uma tela na lista de telas.
- `cor` do time ficou no banco mas não é usada: casa é sempre laranja e visitante violeta.
- **Painel (2026-10-02, pedido do usuário):** ESCALAÇÃO não é mais um item da lista: fica dentro de FUTEBOL, com
  o seletor FUTEBOL | ESCALAÇÃO na prévia (as câmeras seguem a cena escolhida). Atalhos voltaram aos de antes.
  Modais: CONFIGURAR ESCALAÇÃO, AJUSTES do gol (som, duração), porcentagens da enquete e AJUSTAR MOLDURAS
  (formato, tamanho, X/Y, ordem; em todas as telas). À vista: placar, relógio, tempo, REPETIR, MOSTRAR enquete,
  resumo da escalação, EDITAR POSIÇÕES e os nomes das câmeras.
- **Lances (2026-10-02, pedido do usuário):** gol, amarelo, vermelho e substituição. Painel → FUTEBOL → LANCES:
  botão por tipo abre um modal com os jogadores em campo dos dois times (ou OUTRO JOGADOR, "9 Pedro"); o minuto
  sai do relógio. GOL soma 1 no placar com a animação (dá pra desligar no modal); desfazer um gol pergunta e tira
  1 do placar. Substituição: quem sai, depois quem entra (reservas do cadastro ou digitado). Na ESCALAÇÃO: selos
  na bolinha (bola de gol com ×2, cartões, seta de quem entrou), quem entrou ocupa a bolinha de quem saiu,
  expulso (vermelho ou 2 amarelos) fica apagado, a bolinha do lance novo pulsa e um aviso aparece 8 s no topo do
  campo. LISTA mostra os mesmos selos. Ficam no estado (`escLances`, sem migration); LIMPAR LANCES pro próximo jogo.
  Prints: `docs/prints/escalacao-lances-{campo,lista}.png`, `painel-lances.png`, `painel-lance-gol.png`.
- **Confirmação padrão do painel** (`src/painel/Confirmar.tsx`, no lugar do `window.confirm`): cartão animado com
  ícone (bola, cartão vermelho, aviso), Enter confirma, Esc cancela só ela. Usada em GOL e VERMELHO (antes de
  registrar), RESETAR FORMAÇÃO, trocar formação com posições manuais, tirar gol, LIMPAR LANCES, descartar/excluir
  time. Prints `docs/prints/confirmar-{gol,vermelho,resetar}.png`.
- Relógio do placar (FUTEBOL e ESCALAÇÃO) com tempo completo `67:23`; de 100 min pra cima a fonte cai pra 40 px.
- Fundo igual ao do FUTEBOL (escuro com listras), como na referência.

**Falta**
- Rodar a 0012, merge, cena no OBS (acima).
- Editar os elencos de exemplo de verdade no cadastro.
- Conferir no OBS com as câmeras de verdade.

## Próximas funcionalidades

### Ajuste do relógio no FUTEBOL — no ar desde 2026-10-01
±10 s / ±1 min, tempo exato com máscara (2354 → 23:54) e RETOMAR, pela hora do servidor. Junto: "+ gol"
somado no banco e versão da sala (0008 rodada em produção). Falta só o teste numa live.

### Molduras de câmera editáveis — 2026-10-01
HOST, MESA, FILME e FUTEBOL: cada tela guarda a sua lista (`camsHost`, `camsMesa`, `camsFilme`, `camsFutebol`;
null = layout automático). No painel: ponto de partida (layouts automáticos), + ADICIONAR CÂMERA, nome, formato
(16:9, 4:3, 1:1, 9:16, livre), largura/altura/X/Y (X/Y = canto inferior esquerdo), ordem e remover; arrastar e
redimensionar em cima da prévia. Modo "câmeras manuais" removido. Sem migration. Falta conferir no OBS.

### Parte 4: apoios — no ar desde 2026-10-01
0007 rodada, envs na Vercel, webhook cadastrado (`6abe437ab87a0a400e0f9e32`), `/alerta` no OBS testado com superchat, sticker e membro falsos (`scripts/superchat-falso.mjs`). Falta:
- **PIX real somando na meta** (ainda não conferido).
- **Cota da API do LivePix** (50/min) vive esgotada por algo fora do projeto: procurar app/integração/widget antigo na conta. O webhook já espera o reset (até ~50 s) antes de devolver erro.
- Apagar os apoios "TESTE Claude", se algum painel estava aberto durante o teste.

### Playlist dos alertas do YouTube — no ar desde 2026-10-01 (0009 e 0010 rodadas)
Bloco ALERTAS YT no painel: tocando, fila e já tocou; tocar agora, tocar de novo, tirar, pular, pausar/retomar a fila.
A fonte /alerta anuncia a fila (broadcast "alerta-fila") e obedece `alerta_comandos` (0010). PIX seguem no widget
do LivePix (a API dele não deixa escolher qual alerta tocar). Ordem: rodar `0010_alerta_comandos.sql` → push.

### Telas JOGO e REACT — no ar desde 2026-10-01
Transparentes, só molduras. JOGO: gameplay na tela inteira (sem etiqueta) + câmera no canto de baixo à direita.
REACT: uma câmera em cada canto de cima. Editáveis como as outras (`camsJogo`, `camsReact`). Sem migration.

### Animação de gol (FUTEBOL) — no ar desde 2026-10-01 (0011 rodada)
Fonte nova `/gol` (1920×1080, transparente, no topo da cena FUTEBOL, acima das câmeras), igual à
`referencia/Animacao Gol.dc.html` (`scripts/comparar-gol.mjs`, `docs/prints/gol-lado-a-lado.png`).
Painel: chave por time (casa ligada, fora desligada), REPETIR ANIMAÇÃO, SOM DO GOL (apito sintético
`public/gol-apito.wav`), duração 3–6 s. O gol nasce no banco (`somar_gol` grava `golEvento`; "–" anula;
`repetir_gol`). O /alerta segura a fila e o LivePix enquanto o gol está na tela.
Falta: teste num jogo de verdade (fonte /gol no topo da cena, "Controlar áudio via OBS" pro apito).

## Problemas menores (revisão da parte 1)

Todos corrigidos. Em 2026-10-01: gravação recusada mostra "NÃO GRAVOU: motivo" em vez de RECONECTANDO;
comentário do `===` no `useLive`; visitante sem EXECUTE nas funções de escrita (`0009_permissoes.sql`, rodar em produção).

Corrigidos em 2026-10-01 (0008): resposta velha sobrescrevendo (versão da sala) e gol perdido com cliques simultâneos (`somar_gol`).

Já corrigidos (2026-09-29, ledger `.superpowers/sdd/2026-09-28-telas-novas-parte-1/progress.md`):
- **Reconexão**: estado e lista de PIX recarregam ao reconectar o Realtime, quando a internet volta e quando a aba volta a ficar visível.
- **META vazia**: apagar o campo não grava mais R$ 1.
- **Flush ao sair da página**: o que estava esperando os 400 ms é gravado na hora ao esconder/fechar a aba.
