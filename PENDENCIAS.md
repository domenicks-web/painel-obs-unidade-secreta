# Pendências

## Próximas funcionalidades

### Ajuste do relógio no FUTEBOL
Para ressincronizar quando a transmissão travar:
- botões **−1 min**, **−10 s**, **+10 s**, **+1 min**;
- campo para digitar o tempo exato (ex.: `37:12`);
- **PAUSAR / RETOMAR**.

Vale na hora para todas as telas: o ajuste mexe no relógio do servidor (`clockInicio` / `clockAcumulado`), não no navegador de quem clicou.

### Grade automática de câmeras
- Distribuição automática pelo número de câmeras: 1 no centro, 2 lado a lado, 3 em colunas…
- Modo **câmeras manuais**: as molduras somem da tela e as câmeras são adicionadas direto pelo OBS.

### Parte 4: apoios — feita, falta ligar em produção
Implementada em 2026-09-29 (spec `docs/superpowers/specs/2026-09-29-parte-4-apoios-design.md`, README 4.3). Para funcionar em produção:
- rodar `supabase/migrations/0007_apoios.sql` no Supabase de produção **antes** do deploy do front novo;
- criar na Vercel `LIVEPIX_CLIENT_ID`, `LIVEPIX_CLIENT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `ALERTA_CHAVE`;
- criar o app no LivePix (escopos `messages:read` e `webhooks`) e cadastrar o webhook (`node scripts/livepix-webhook.mjs …`);
- fonte `/alerta?sessao=…&chave=…` no OBS;
- testes reais: um PIX de verdade somando na meta, um superchat e um membro numa live de teste.

### Kit OBS
Pasta `kit-obs/` com:
- a coleção de cenas e o perfil do OBS exportados, **sem caminhos absolutos** e **sem o ID de sessão do chat**;
- um `LEIA.md` com o passo a passo para outra pessoa configurar do zero.

## Testes

- **Chat com mensagens reais** numa live de teste (chat em pop-up + Social Stream Ninja). As mensagens de teste do SSN já chegaram no `/chat`; falta YouTube/Twitch/TikTok de verdade, DESTACAR/TIRAR e filtros no painel.
- **Serrilhado do quadro US no OBS**: se ainda aparecer depois da correção de 2026-09-29 (logo girando dentro do SVG, `bd719ab`), investigar de novo. Conferir no projetor em tela cheia, não na prévia.

## Problemas menores (revisão da parte 1)

Ainda abertos:
- **Resposta velha sobrescrevendo**: a resposta da RPC pode trazer um estado mais velho que um eco do Realtime já recebido (`useLive.enviar`).
- **Erro de gravação sem motivo**: "RECONECTANDO" fica aceso depois de um erro de validação e o motivo não aparece.
- **Gol perdido com cliques simultâneos**: dois cliques em "+ gol" ao mesmo tempo (dois painéis) podem perder um gol.
- `anon` ainda tem EXECUTE nas RPCs de escrita via PUBLIC (as funções recusam por dentro).
- Comentário explicando a comparação de pendentes por referência no `useLive`.

Já corrigidos (2026-09-29, ledger `.superpowers/sdd/2026-09-28-telas-novas-parte-1/progress.md`):
- **Reconexão**: estado e lista de PIX recarregam ao reconectar o Realtime, quando a internet volta e quando a aba volta a ficar visível.
- **META vazia**: apagar o campo não grava mais R$ 1.
- **Flush ao sair da página**: o que estava esperando os 400 ms é gravado na hora ao esconder/fechar a aba.

## Arrumação

- Trocar a senha do admin (foi colada no chat).
