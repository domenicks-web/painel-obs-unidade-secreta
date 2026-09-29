# Parte 4 — apoios (PIX automático, superchat, sticker, membro) e /alerta

Base: `PENDENCIAS.md` (Parte 4), `referencia/Alerta YT.dc.html`, docs do LivePix (`https://api.livepix.gg/open-api.json`) e o código do Social Stream Ninja.

## Banco (migration 0007)

- A tabela `pix` vira **`apoios`** (tabela única). Colunas novas:
  - `tipo`: `pix` | `superchat` | `sticker` | `membro`;
  - `valor_texto`: o valor como veio da plataforma (`US$ 10.00`), vazio no PIX.
- `origem`: `manual` | `livepix` | `youtube`. `valor` sempre em **BRL**. Membro tem valor 0; os outros tipos têm valor > 0, exceto superchat em moeda desconhecida, que fica com 0 e aparece com o valor original.
- `externo_id` único: é o que impede o mesmo apoio de entrar duas vezes (webhook repetido, dois painéis abertos).
- **Meta** = soma de todos os apoios ativos (PIX + superchat + sticker convertidos) + ajuste.
- **"Último PIX"** (card do Host) continua só PIX. **"Top da live"** considera qualquer apoio pago.
- Funções:
  - `adicionar_pix_manual`: a mesma de antes.
  - `alternar_apoio`: substitui `alternar_pix`.
  - `registrar_apoio_youtube`: chamada pelo painel, só para quem é da equipe.
  - `registrar_pix_livepix`: só `service_role`, chamada pelo webhook.
  - `registrar_comando_livepix_alerta`: só `service_role`, com `por_nome = 'ALERTA'`.

## PIX automático (webhook do LivePix)

- O LivePix chama `POST /api/livepix/webhook` com `{event, resource: {id, type}}`. O webhook não tem assinatura: o servidor busca a mensagem na API (`GET /v2/messages/{id}`, OAuth `client_credentials`, escopo `messages:read`). Só o que a API confirma entra no banco. O `amount` vem em centavos.
- Cadastro do webhook: `node scripts/livepix-webhook.mjs <url>` (escopo `webhooks`).
- Variáveis novas (só servidor): `LIVEPIX_CLIENT_ID`, `LIVEPIX_CLIENT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`.

## Superchat, super sticker e membro (Social Stream Ninja)

- Só **YouTube** entra em apoios e no alerta:
  - superchat: evento `superchat`;
  - sticker: evento `supersticker`;
  - membro novo: eventos `sponsorship` e `giftredemption` (aniversário de membro não conta).
- Twitch e TikTok continuam só no chat.
- **Quem grava é o painel** (o SSN entrega as mensagens no navegador, e um servidor na Vercel não segura WebSocket). Cada painel aberto tenta gravar; o `externo_id` (`yt:<id do SSN>:<autor>:<valor>`) deduplica.
- **Conversão para BRL**: o painel pega as cotações em `/api/cambio` (servidor, cache de 6 h, fonte `open.er-api.com`; se falhar, usa uma tabela fixa) e lê o texto do valor (`R$ 10,00`, `US$ 5.00`, `$5.00`, `€5,00`, `MX$100.00`, `¥500`…).

## /alerta

- `/alerta?sessao=ID&chave=K`: fonte 1920×1080 transparente. Escuta o SSN direto, então não depende do painel aberto. Um alerta por vez: 0,5 s entrando, 6 s na tela, 0,5 s saindo. Visual idêntico à referência.
- **LivePix pausado enquanto toca**:
  - Quando a fila começa, `POST /api/livepix/alerta {acao: 'segurar'}`, com o cabeçalho `x-alerta-chave`.
  - Quando a fila esvazia, `{acao: 'soltar'}`. Também é chamado ao fechar a fonte.
  - Se o LivePix já estava pausado pela equipe, o alerta não mexe.
  - Só retoma se a última pausa foi do próprio alerta: se alguém pausou no meio, fica pausado.
- Variável nova: `ALERTA_CHAVE` (servidor). A mesma chave vai na URL do OBS.
- `/alerta?teste=1`: a página de teste da referência (botões, fila, prévia em 50%), sem LivePix.

## Painel

- A lista "PIX" da coluna direita vira **"APOIOS"**: etiqueta do tipo (PIX, SC, ST, MEMBRO), nome, valor em R$ (e o original, quando é moeda de fora), ×/↺ para não contar. O PIX manual continua igual.

## Etapas (um commit cada)

1. Migration 0007 + testes SQL.
2. Servidor: webhook do LivePix, `/api/cambio`, `/api/livepix/alerta`, script de cadastro do webhook.
3. Front: normalização do SSN (sticker, membro novo), conversão, painel grava os apoios do YouTube, lista APOIOS.
4. `/alerta` + modo teste + prints lado a lado.
5. README, `.env.example`, PENDENCIAS.

**Produção**: o front novo depende da 0007. O push só acontece depois que a migration rodar no Supabase de produção.
