# Pendências

## Próximas funcionalidades

### Ajuste do relógio no FUTEBOL — feito (2026-10-01), falta a 0008 em produção
±10 s / ±1 min, tempo exato (MM:SS) e RETOMAR, pela hora do servidor. Junto: "+ gol" somado no banco
e versão da sala (resposta atrasada não traz estado velho). Ordem: rodar `0008_relogio_gols_versao.sql` → push.

### Grade automática de câmeras
- Distribuição automática pelo número de câmeras: 1 no centro, 2 lado a lado, 3 em colunas…
- Modo **câmeras manuais**: as molduras somem da tela e as câmeras são adicionadas direto pelo OBS.

### Parte 4: apoios — no ar desde 2026-10-01
0007 rodada, envs na Vercel, webhook cadastrado (`6abe437ab87a0a400e0f9e32`), `/alerta` no OBS testado com superchat, sticker e membro falsos (`scripts/superchat-falso.mjs`). Falta:
- **PIX real somando na meta** (ainda não conferido).
- **Cota da API do LivePix** (50/min) vive esgotada por algo fora do projeto: procurar app/integração/widget antigo na conta. O webhook já espera o reset (até ~50 s) antes de devolver erro.
- Apagar os apoios "TESTE Claude", se algum painel estava aberto durante o teste.

### Kit OBS
Pasta `kit-obs/` com:
- a coleção de cenas e o perfil do OBS exportados, **sem caminhos absolutos** e **sem o ID de sessão do chat**;
- um `LEIA.md` com o passo a passo para outra pessoa configurar do zero.

## Testes

- **Chat com mensagens reais** numa live de teste (chat em pop-up + Social Stream Ninja). As mensagens de teste do SSN já chegaram no `/chat`; falta YouTube/Twitch/TikTok de verdade, DESTACAR/TIRAR e filtros no painel.
- **Serrilhado do quadro US no OBS**: se ainda aparecer depois da correção de 2026-09-29 (logo girando dentro do SVG, `bd719ab`), investigar de novo. Conferir no projetor em tela cheia, não na prévia.

## Problemas menores (revisão da parte 1)

Ainda abertos:
- **Erro de gravação sem motivo**: "RECONECTANDO" fica aceso depois de um erro de validação e o motivo não aparece.
- `anon` ainda tem EXECUTE nas RPCs de escrita via PUBLIC (as funções recusam por dentro).
- Comentário explicando a comparação de pendentes por referência no `useLive`.

Corrigidos em 2026-10-01 (0008): resposta velha sobrescrevendo (versão da sala) e gol perdido com cliques simultâneos (`somar_gol`).

Já corrigidos (2026-09-29, ledger `.superpowers/sdd/2026-09-28-telas-novas-parte-1/progress.md`):
- **Reconexão**: estado e lista de PIX recarregam ao reconectar o Realtime, quando a internet volta e quando a aba volta a ficar visível.
- **META vazia**: apagar o campo não grava mais R$ 1.
- **Flush ao sair da página**: o que estava esperando os 400 ms é gravado na hora ao esconder/fechar a aba.

## Arrumação

- Trocar a senha do admin (foi colada no chat).
- Trocar a `ALERTA_CHAVE` (foi colada no chat): Vercel + redeploy + URL da fonte no OBS.
