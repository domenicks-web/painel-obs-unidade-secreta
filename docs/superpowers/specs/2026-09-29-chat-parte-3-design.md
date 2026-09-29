# Parte 3 — chat (Social Stream Ninja)

Base: `TELAS-NOVAS.md` §4, `referencia/Chat US.dc.html` (overlay) e o bloco CHAT de `referencia/Painel US.dc.html`.

## Conexão

- Servidor de API do Social Stream Ninja: `wss://io.socialstream.ninja/join/<SESSAO>/4` (canal 4 = mensagens de chat que a extensão manda).
  Na extensão: Global settings → Mechanics → ligar "Enable remote API control of extension" e "Send chat messages to API server".
- Cada mensagem chega como objeto cru: `chatname`, `chatmessage` (pode ter HTML de emote quando `textonly` é falso), `type` (`youtube`, `twitch`, `tiktok`…), `hasDonation`, `membership`, `event`, `moderator`, `chatbadges`, `id`.
- Normalização (`src/chat/ssn.ts`): só YT/TW/TT (outras plataformas são ignoradas); texto puro (emote vira o `alt`); `hasDonation` → superchat com o valor como veio; `membership`/evento de membro sem texto → cartão "novo membro"; outros eventos sem texto (follow, entrou) são ignorados.
- Reconecta sozinho (1 s → 10 s). Não há estado no servidor: quem abre agora só vê o que chegar daqui pra frente.

## Onde fica o ID da sessão

O ID dá acesso ao controle remoto da extensão, então **não vai para o estado da live** (que é público, as telas leem sem login).
- Overlay: na URL da fonte do OBS, `/chat?sessao=ID`.
- Painel: digitado uma vez por navegador, guardado no `localStorage`.

## Overlay `/chat`

- Fundo transparente, ocupa a fonte inteira (o OBS define o tamanho: 440×800 Host, 440×910 Futebol, 440×750 Filme). Mensagens empilham de baixo pra cima, faixa listrada de 8 px embaixo, como na referência. Guarda as últimas 9.
- Visual das mensagens idêntico à referência (etiqueta com o nome, MOD, bolinha de membro, superchat, novo membro).
- Tag da plataforma: chip escuro dentro da etiqueta do nome, com a sigla na cor da plataforma (YT laranja, TW violeta, TT creme), no mesmo estilo do chip MOD.
- Destaque (`chatPin` do estado): cartão violeta fixo no topo, no estilo do cartão de novo membro, até alguém clicar TIRAR. **Não existe na referência**: decisão nossa, mostrar no print.
- `?teste=1`: a página de teste da referência (botões mensagem/superchat/membro/auto/limpar), mais um botão de destaque local. Não conecta em nada.

## Painel

- Coluna direita, bloco CHAT como na referência: filtros YT/TW/TT, lista (14 mais novas, a mais nova em cima), DESTACAR grava `chatPin` na hora, faixa violeta "NA TELA · autor" com TIRAR.
- Sem sessão: campo para colar o ID. Com sessão: rodapé mostra a sessão e TROCAR.
- Selo CHAT do topo: aceso quando o WebSocket está aberto; `SEM SESSÃO` / `RECONECTANDO…`.
- `/painel?chatTeste=1`: alimenta a lista com as mensagens fictícias (prints e demonstração).
