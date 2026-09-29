# Unidade Secreta: telas da live + painel

Arquivos de referência em `referencia/`. Eles abrem direto no navegador, com o `support.js` na mesma pasta. O visual é a especificação: portar mantendo cores, fontes, tamanhos, posições e animações idênticos.

- `Telas Live.dc.html`: as 9 telas da live (canvas fixo 1920×1080)
- `Slot Camera.dc.html`: moldura de câmera usada dentro das telas (props `nome`, `w`, `h`)
- `Chat US.dc.html`: overlay do chat
- `Painel US.dc.html`: painel ADM (layout e comportamento de referência)
- `Login Painel.dc.html`: login (já integrado)

Fontes (Google Fonts): Bungee, Barlow Condensed 500/600/700, JetBrains Mono 400/700.
Cores: laranja `#FF6B1F`, tinta `#1A1417`, creme `#FFF3E0`, violeta `#8B6CF0`.

## 1. Telas da live (fontes de navegador no OBS)

Cada tela vira uma URL própria, com fundo transparente e sem nenhuma UI:
`/tela/inicio`, `/tela/host`, `/tela/futebol`, `/tela/filme`, `/tela/mesa`, `/tela/intervalo`, `/tela/lower`, `/tela/tecnico`, `/tela/fim`

(Na referência, isso é `Telas Live.dc.html?tela=host`.)

**A troca de cena é feita no OBS**, com a transição Fita (stinger) e o Modo Estúdio. O painel NÃO troca cena: ele só edita as infos. Todas as telas escutam o mesmo estado e atualizam na hora (Supabase Realtime), mesmo quando não estão no ar.

### Estado que as telas leem (uma linha/documento "live" no Supabase)

Geral
- `titulo` (string, padrão "OPERAÇÃO AO VIVO")
- `ticker` (string, frases separadas por ●, renderizadas com bolinha CSS centralizada, não com o caractere)
- `nomes` (array de 6 strings: câmeras 01–06; o nomes[0] também é o nome do lower third)

Início / Intervalo
- `minutos` (int)
- `resetKey` (int): quando muda, o countdown reinicia
- `msg` (Intervalo, texto ondulante)

Host
- `hostCams` ("1" | "2" | "3")
- `pixLink` (string)
- `metaAtual`, `metaTotal`, `metaDesc`
- `pixNome`, `pixValor` (último PIX)
- `topNome`, `topValor` (maior PIX da live)

Futebol
- `timeA`, `timeB`, `golsA`, `golsB`
- `relogio` (minutos): o painel roda o relógio (iniciar/pausar/zerar); salvar `clockStart` + `clockAcumulado` e calcular nas telas, pra não gravar no banco a cada segundo
- `jogo` ("1º TEMPO" | "INTERVALO" | "2º TEMPO" | "PRORROGAÇÃO")

Filme: `filme`, `episodio`
Lower third: `funcao`
Fim: `proximo`

Áreas reservadas pra outras fontes do OBS, que as telas não desenham:
- chat: 440×800 no Host, no Futebol e no Filme (mudado a pedido do usuário em 2026-09-29)
- câmeras: todas em 16:9 por dentro (idem)
- QR code do PIX: 214×214 no Host com 1 câmera

## 2. Painel ADM

Seguir `Painel US.dc.html`:
- **Topo:** logo, "INFOS DAS TELAS · A TROCA DE CENA É NO OBS", status (telas sincronizadas / LivePix / chat) com dados reais de conexão.
- **Esquerda:** lista das 9 telas. Clicar só escolhe qual editar.
- **Centro:** prévia renderizando a tela real (mesmo componente das URLs do OBS, escalado), com o aviso "PRÉVIA · NÃO É O QUE ESTÁ NO AR". Embaixo ficam só os campos da tela selecionada; título e letreiro ficam sempre visíveis.
- **Direita, PIX:** meta (objetivo, total, ajuste manual), lista de PIX com "×" (não contar) / "↺" (voltar a contar), e "+ ADD" pra PIX manual.
- **Direita, chat:** filtros YT/TW/TT, lista ao vivo, "DESTACAR" (mensagem fixada), "TIRAR".

Regras de cálculo:
- `metaAtual` = soma dos PIX ativos + `ajuste`
- último = PIX ativo mais recente
- top = PIX ativo de maior valor

Tudo isso é gravado no estado e as telas recebem via Realtime.

## 3. PIX automático (LivePix)

A API do LivePix é gratuita (OAuth2 client_credentials; docs em https://docs.livepix.gg).
1. Criar uma aplicação na conta LivePix e guardar `client_id`/`client_secret` como env no Vercel. **Nunca no front.**
2. Cadastrar o webhook do LivePix apontando pra uma função serverless (`/api/livepix-webhook`).
3. O webhook manda só dados básicos: a função consulta a API do LivePix pra pegar nome, valor e mensagem e insere na tabela `pix` (com `origem='livepix'`, `off=false`).
4. PIX manual do painel entra na mesma tabela com `origem='manual'`.
5. Deduplicar pelo ID do LivePix.

## 4. Chat (Social Stream Ninja)

- O streamer usa o Social Stream Ninja (grátis) pra juntar YouTube + Twitch + TikTok. Ele gera um ID de sessão.
- `Chat US` vira a URL `/chat?sessao=ID`: fundo transparente, visual idêntico à referência (badges de mod/membro, superchat, notificação de membro). Conectar pela API/WebSocket do Social Stream Ninja (conferir a documentação oficial pra URL e formato das mensagens).
- Mapear a plataforma pra tag: YT (laranja), TW (violeta), TT (creme).
- O painel lê o mesmo fluxo pra lista. "DESTACAR" grava `chatPin {autor, txt, plataforma}` no estado; o overlay do chat mostra a mensagem fixada no topo até "TIRAR".
- Manter o modo teste da referência atrás de `?teste=1`.

## 5. Checklist de entrega

- [ ] 9 URLs de tela, transparentes, 1920×1080, idênticas à referência
- [ ] URL do chat, transparente
- [ ] Painel com prévia real + campos por tela, sem troca de cena
- [ ] Realtime funcionando: mudar no painel → aparece no OBS em < 1s
- [ ] Webhook LivePix + PIX manual + ajuste
- [ ] Rotas do painel protegidas pelo login; as rotas de tela/chat são públicas (só leitura)
