# Pendências

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

### Playlist dos alertas do YouTube — feita (2026-10-01), falta a 0010 em produção
Bloco ALERTAS YT no painel: tocando, fila e já tocou; tocar agora, tocar de novo, tirar, pular, pausar/retomar a fila.
A fonte /alerta anuncia a fila (broadcast "alerta-fila") e obedece `alerta_comandos` (0010). PIX seguem no widget
do LivePix (a API dele não deixa escolher qual alerta tocar). Ordem: rodar `0010_alerta_comandos.sql` → push.

### Kit OBS
Pasta `kit-obs/` com:
- a coleção de cenas e o perfil do OBS exportados, **sem caminhos absolutos** e **sem o ID de sessão do chat**;
- um `LEIA.md` com o passo a passo para outra pessoa configurar do zero.

## Testes

- **Chat com mensagens reais** numa live de teste (chat em pop-up + Social Stream Ninja). As mensagens de teste do SSN já chegaram no `/chat`; falta YouTube/Twitch/TikTok de verdade, DESTACAR/TIRAR e filtros no painel.
- **Serrilhado do quadro US no OBS**: se ainda aparecer depois da correção de 2026-09-29 (logo girando dentro do SVG, `bd719ab`), investigar de novo. Conferir no projetor em tela cheia, não na prévia.

## Problemas menores (revisão da parte 1)

Todos corrigidos. Em 2026-10-01: gravação recusada mostra "NÃO GRAVOU: motivo" em vez de RECONECTANDO;
comentário do `===` no `useLive`; visitante sem EXECUTE nas funções de escrita (`0009_permissoes.sql`, rodar em produção).

Corrigidos em 2026-10-01 (0008): resposta velha sobrescrevendo (versão da sala) e gol perdido com cliques simultâneos (`somar_gol`).

Já corrigidos (2026-09-29, ledger `.superpowers/sdd/2026-09-28-telas-novas-parte-1/progress.md`):
- **Reconexão**: estado e lista de PIX recarregam ao reconectar o Realtime, quando a internet volta e quando a aba volta a ficar visível.
- **META vazia**: apagar o campo não grava mais R$ 1.
- **Flush ao sair da página**: o que estava esperando os 400 ms é gravado na hora ao esconder/fechar a aba.

## Arrumação

- Trocar a `ALERTA_CHAVE` (foi colada no chat): Vercel + redeploy + URL da fonte no OBS.
