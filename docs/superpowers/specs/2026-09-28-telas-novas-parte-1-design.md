# Telas novas — Parte 1: estado, PIX, 9 telas, /alerta e painel

Base: `TELAS-NOVAS.md` (seções 1, 2 e 5) + arquivos de `referencia/`. Este documento registra o que foi decidido com o usuário em 2026-09-28 por cima do `TELAS-NOVAS.md`. Onde os dois divergem, vale este.

Partes 2 (LivePix) e 3 (chat Social Stream Ninja) têm specs próprias depois. A parte 1 já deixa o banco pronto para elas (coluna `externo_id`, `chatPin` reservado).

## Objetivo

Trocar as telas e o painel antigos pelos novos da referência, com o visual idêntico, estado único sincronizado por Supabase Realtime, PIX manual com meta calculada no banco e um alerta de PIX por cima das cenas.

## Fora do escopo (removido do projeto antigo)

- Rotas `/overlay/:cena`, `/preview`, parâmetro `?sala=` (a sala é sempre `principal`).
- Lower third com tempo automático (quem mostra/esconde é o OBS).
- Tabela `eventos` e função `disparar_evento`.

Permanecem: login (`/login`), `/admin`, `useAuth`, `RotaProtegida`, `papel_atual()`, `vercel.json`.

## Banco

### Estado (`salas.estado`, linha `slug = 'principal'`)

A migration `0005` substitui o JSON inteiro pelos valores padrão abaixo (os padrões são os mesmos da referência, pra comparação visual bater).

| Campo | Tipo | Padrão | Quem grava |
|---|---|---|---|
| `titulo` | string | `OPERAÇÃO AO VIVO` | painel |
| `ticker` | string | `SE INSCREVE NO CANAL ● ATIVA O SININHO ● MANDA O PIX NA DESCRIÇÃO ● A UNIDADE NÃO PARA` | painel |
| `nomes` | string[6] | `NOME 01`…`NOME 06` | painel (texto final; não acompanha renomeação na galera) |
| `galera` | `{id,nome,funcao}[]`, máx. 20 | `[]` | painel (modal GALERA) |
| `minutos` | int | 5 | painel; mudar reinicia a contagem |
| `timerInicio` | ms epoch \| null | null | só `reiniciar_contagem()` e mudança de `minutos` (hora do servidor) |
| `msg` | string | `VOLTAMOS JÁ` | painel |
| `hostCams` | `'1'\|'2'\|'3'` | `'1'` | painel |
| `pixLink` | string | `LIVEPIX.GG/UNIDADESECRETA` | painel |
| `metaDesc` | string | `PIZZA PRA RAPAZIADA` | painel |
| `metaTotal` | number | 500 | painel; dispara recálculo |
| `ajuste` | number | 0 | painel; dispara recálculo |
| `metaAtual`, `pixNome`, `pixValor`, `topNome`, `topValor` | number/string | 0 / `—` | **só o banco** (`recalcular_pix`) |
| `timeA`, `timeB` | string | `CASA`, `FORA` | painel |
| `golsA`, `golsB` | int | 0 | painel |
| `jogo` | `'1º TEMPO'\|'INTERVALO'\|'2º TEMPO'\|'PRORROGAÇÃO'\|'OUTRO'` | `1º TEMPO` | painel |
| `jogoOutro` | string | `''` | painel (texto mostrado quando `jogo = 'OUTRO'`) |
| `clockInicio` | ms epoch \| null | null | só `controlar_relogio()` |
| `clockAcumulado` | segundos (number) | 0 | só `controlar_relogio()` |
| `clockRodando` | bool | false | só `controlar_relogio()` |
| `enquete` | `{casa,empate,fora: int 0–100, mostrar: bool}` | `{0,0,0,false}` | painel |
| `filme`, `episodio` | string | `NOME DO FILME`, `T1 · E3` | painel |
| `ltNome`, `funcao` | string | `NOME 01`, `UNIDADE SECRETA` | painel |
| `proximo` | string | `SEXTA, 21H` | painel |
| `chatPin` | objeto \| null | null | reservado (parte 3) |

"Editado por Fulano há X min" usa as colunas já existentes `salas.updated_by_nome` e `salas.updated_at`, gravadas por `atualizar_estado`. O recálculo automático de PIX não mexe nelas.

### Tabela `pix`

`id uuid`, `nome text (1–60)`, `valor numeric(10,2) > 0`, `msg text (≤280, padrão '')`, `origem 'manual'|'livepix'`, `externo_id text unique null`, `off bool default false`, `created_at timestamptz default clock_timestamp()`.

- Leitura pública (RLS `select using (true)`); escrita só por funções `SECURITY DEFINER` que exigem membro da equipe.
- Realtime ligado.

### Regras de cálculo (função `recalcular_pix`, gatilho `after insert/update/delete for each statement` em `pix`)

- `metaAtual = soma(valor dos PIX com off = false) + ajuste`
- último = PIX ativo com maior `created_at` (desempate por `id`)
- top = PIX ativo de maior `valor`; empate → o que chegou primeiro (`created_at` menor)
- sem PIX ativo: nome `—`, valor 0
- `atualizar_estado` também chama `recalcular_pix` quando o patch contém `ajuste` ou `metaTotal`.

### Funções (RPC)

- `atualizar_estado(p_slug, p_patch)`: exige membro; remove do patch as chaves calculadas e as de relógio (`metaAtual, pixNome, pixValor, topNome, topValor, timerInicio, clockInicio, clockAcumulado, clockRodando`); rejeita `galera` com mais de 20; grava `updated_*`; se o patch tem `minutos`, também grava `timerInicio = agora do servidor`.
- `reiniciar_contagem(p_slug)`: `timerInicio = agora do servidor`.
- `controlar_relogio(p_slug, p_acao)`: `iniciar` (se parado: `clockInicio = agora`, `clockRodando = true`), `pausar` (se rodando: soma o trecho em `clockAcumulado`, `clockInicio = null`, `clockRodando = false`), `zerar` (tudo a zero, parado).
- `adicionar_pix_manual(p_nome, p_valor, p_msg default '')`: insere com `origem = 'manual'`.
- `alternar_pix(p_id)`: inverte `off`.
- Removidas: `disparar_evento`, tabela `eventos`.

## Relógios (sempre pela hora do servidor)

- Todas as telas usam um deslocamento servidor−cliente medido com `hora_servidor()` (já existe), ressincronizado a cada 30 s.
- Countdown (Início, Intervalo): `total = minutos*60`. Se `timerInicio` for null, mostra `MM:00` parado. Senão, `restante = max(0, total − (agora − timerInicio)/1000)`. **Para em 00:00** e fica até alguém reiniciar (não recomeça sozinho como na referência). As 10 bolinhas de progresso seguem a fórmula da referência.
- Minuto do jogo (Futebol): `seg = clockAcumulado + (clockRodando ? (agora − clockInicio)/1000 : 0)`; tela mostra `floor(seg/60) + "'"`; painel mostra `MM:SS`.
- Só os componentes pequenos de countdown/relógio re-renderizam por segundo; o resto da tela não.

## Telas (`/tela/:id`, públicas)

IDs: `inicio, host, futebol, filme, mesa, intervalo, lower, tecnico, fim`. Id inválido → tela vazia transparente.

- Palco fixo 1920×1080; `html`, `body` e `#root` transparentes nessas rotas.
- Cada tela é um componente puro `({ estado, agora }) => JSX`, reaproveitado na prévia do painel (escalado com `transform: scale`).
- Markup e CSS portados da `referencia/Telas Live.dc.html` (cores, fontes, tamanhos, posições, keyframes idênticos), com componentes compartilhados: `SlotCamera` (de `Slot Camera.dc.html`), `Letreiro` (itens separados por `●`, `•` ou `|`, bolinha em CSS), `FaixaTicker` (rodapé laranja com listras + letreiro).
- Animações decorativas só em CSS (nada de estado React por ciclo).
- Diferenças deliberadas em relação à referência:
  - Futebol: a linha "VOTA NO CHAT: !A !E !B" sai. A enquete usa `enquete.casa/empate/fora` com os rótulos `timeA`, `EMPATE`, `timeB`; com `mostrar = false` o bloco inteiro some (nada ocupa o lugar). O rótulo do jogo mostra `jogoOutro` quando `jogo = 'OUTRO'`.
  - Lower third: nome = `ltNome` (não `nomes[0]`); fundo transparente no OBS.
  - Host: valores em reais formatados (`25` ou `25,50`).
  - Placeholders internos ("CÂMERA · 924×520", "CHAT · 440×800", "QR CODE") aparecem **só na prévia do painel**; na URL do OBS as caixas ficam com moldura e fundo, sem texto (as câmeras, o chat e o QR entram por cima como fontes do OBS).

## /alerta (público, transparente)

- Carrega nada no início; assina Realtime da tabela `pix`: `INSERT` com `off = false` entra no fim da fila; `UPDATE` que marca `off = true` remove o PIX da fila se ainda não começou a aparecer; `UPDATE` de volta para `off = false` não re-enfileira.
- Mostra um por vez: 0,5 s entrando, 6 s parado, 0,5 s saindo; o próximo só entra depois que o anterior saiu. Nada é pulado.
- Visual: faixa listrada tinta/laranja, cartão laranja com nome (Barlow Condensed caixa-alta), valor em Bungee, mensagem; sombra deslocada violeta. Canto inferior esquerdo do palco 1920×1080. **Mandar print ao usuário para aprovar**; se não curtir, ele manda referência.
- Som opcional: `/alerta.mp3` (arquivo em `public/`) toca ao entrar cada alerta; se o arquivo não existir ou o navegador bloquear, segue sem som. Volume é ajustado no OBS.

## Painel (`/painel`, com login)

Layout de `referencia/Painel US.dc.html`: topo, três colunas; no celular (< 1100 px) empilha, com as telas virando uma fileira rolável.

- **Topo:** logo US, "PAINEL DA LIVE", "INFOS DAS TELAS · A TROCA DE CENA É NO OBS"; status: `TELAS SINCRONIZADAS` (estado real do canal Realtime: aceso quando conectado, apagado/"RECONECTANDO" quando não), `LIVEPIX` e `CHAT` apagados com "EM BREVE"; "editado por Fulano há X min" discreto; botão GALERA; link ADMIN só para `papel = 'admin'`; botão SAIR.
- **Esquerda:** 9 telas (clicar só escolhe qual editar; atalhos 1–9 no teclado quando o foco não está num campo).
- **Centro:** prévia da tela real escalada, com o selo "PRÉVIA · NÃO É O QUE ESTÁ NO AR"; abaixo, os campos da tela escolhida e, sempre, TÍTULO e LETREIRO.
  - Início/Intervalo: minutos (2/5/10/15/30), ↻ REINICIAR; Intervalo tem FRASE NA TELA.
  - Host: câmeras 1/2/3 + campos de câmera; PIX LINK.
  - Futebol: times, gols −/+, relógio (▶ INICIAR / ❚❚ PAUSAR / ZERAR, mostra MM:SS), jogo (4 opções + OUTRO com texto), enquete (CASA/EMPATE/FORA em %, chave MOSTRAR/ESCONDER), 2 câmeras.
  - Filme: EM CARTAZ, EPISÓDIO, 4 câmeras. Mesa: 6 câmeras.
  - Lower: QUEM TÁ FALANDO (botões com a galera → preenche `ltNome` e `funcao`), campo NOME livre, FUNÇÃO / LEGENDA.
  - Fim: PRÓXIMA LIVE. Técnico: "Essa tela não tem infos pra editar."
  - Campo de câmera: texto livre com lista da galera filtrando enquanto digita (componente próprio, mesmo visual; teclado ↑↓ Enter Esc).
- **Direita, PIX:** meta (descrição, %, R$ atual / total, barra), campos OBJETIVO / META R$ / AJUSTE R$, lista (nome, origem LIVEPIX/MANUAL, msg, valor, × não contar / ↺ voltar a contar; riscado e esmaecido quando off), PIX manual (nome, R$, + ADD).
- **Direita, chat:** caixa com "O CHAT CHEGA NA PARTE 3".
- **GALERA (modal):** lista de até 20 (nome, função, remover), + ADICIONAR (desabilitado com 20), Esc/fora fecha.

### Salvamento

- Texto: grava 400 ms depois da última tecla; enquanto um campo está com foco/edição pendente, eco do Realtime não sobrescreve aquele campo.
- Botões/chaves: gravam na hora (update otimista).
- Relógio do jogo e reiniciar contagem: RPCs dedicadas (hora do servidor).
- Erro de gravação: status do topo vira "RECONECTANDO" e o valor volta a ser o do servidor no próximo eco.

## Testes e verificação

- Vitest: funções puras (relógios, formatação, letreiro, fila do alerta), hooks com Supabase mockado, componentes das telas (dados aparecem, enquete some) e do painel (campos gravam o patch certo).
- SQL: `supabase/testes/rodar.sh` sobe `postgres:17-alpine` em Docker com stub do `auth`, roda todas as migrations e `supabase/testes/0005.sql` (asserts de cálculo, empate, ajuste, off, filtros do patch, relógio, permissões).
- Comparação visual: `scripts/comparar-telas.mjs` (playwright-core + Chromium do cache) tira print 1920×1080 de cada `referencia/Telas Live.dc.html?tela=X` e de `/tela/X?fixture=referencia` (mesmos dados da referência, sem Supabase) e monta imagens lado a lado em `docs/prints/`.

## Entregáveis ao usuário no fim da parte 1

Lista das URLs, print do `/alerta`, prints das 9 telas lado a lado com a referência.

## Pontos a confirmar com o usuário (decisões visuais, não bloqueiam o início)

1. Placeholders "CÂMERA · W×H" / "CHAT" / "QR CODE" escondidos na URL do OBS (mostrados só na prévia). No OBS as câmeras, o chat e o QR ficam em camadas **acima** da fonte da tela.
2. Visual do `/alerta` (print para aprovar).
