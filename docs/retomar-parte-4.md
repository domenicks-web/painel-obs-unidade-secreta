# Ao retomar: reenviar esta mensagem ao usuário (pedido dele em 2026-09-29, 20:17)

A Parte 4 está implementada e commitada localmente, mas **ainda não foi para produção**. O front novo lê a tabela `apoios`, que só passa a existir depois da migration 0007. Se eu fizer o push antes, o painel de produção quebra.

**O que foi feito:**
- **`/alerta`:** superchat, super sticker e membro novo do YouTube, idênticos à referência (prints em `docs/prints/alerta-{superchat,sticker,membro}-lado-a-lado.png`). Mostra um por vez: 0,5 s entrando, 6 s na tela e 0,5 s saindo.
  - Pausa o LivePix no primeiro alerta da fila e retoma quando a fila acaba, e também quando a fonte é fechada.
  - Se a equipe já tinha pausado, ou pausou no meio, o alerta não retoma.
  - Conferi que nenhuma caixa girada vira camada à parte, então não deve haver serrilhado como no logo.
- **PIX automático:** o LivePix avisa o site a cada PIX. O servidor confere a mensagem na API do LivePix, porque o aviso não tem assinatura, e grava. Aviso repetido não duplica.
- **Superchat e membro:** o painel grava os que chegam pelo chat do SSN, convertidos para real com a cotação do dia. Se a fonte de cotação cair, usa uma tabela fixa.
- **Painel:** a lista virou **APOIOS**, com o tipo, o valor em real e o valor original quando é moeda de fora.
- **Testes:** 191 do front, a suíte SQL e o build passam. São 5 commits locais.

**Decisões que tomei (me diga se quer diferente):**
- A meta soma PIX + superchat + sticker convertidos. O card "ÚLTIMO PIX" continua só com PIX; o "TOP DA LIVE" vale para qualquer apoio pago.
- Só o YouTube vira apoio e alerta. Twitch e TikTok ficam só no chat. Aniversário de membro não conta.
- Superchat só é gravado se algum painel estiver aberto na hora. O alerta toca de qualquer jeito, porque escuta o SSN direto.

**Para ligar em produção:**
1. **Rodar `supabase/migrations/0007_apoios.sql`** no SQL Editor do Supabase de produção. Os PIX que já existem continuam. Me avise quando rodar que eu faço o push na hora.
2. **Criar um app no LivePix**, no painel de desenvolvedores, com os escopos `messages:read` e `webhooks`.
3. **Criar 4 variáveis na Vercel:**
   - `LIVEPIX_CLIENT_ID` e `LIVEPIX_CLIENT_SECRET`: do app do passo 2.
   - `SUPABASE_SERVICE_ROLE_KEY`: a chave secreta do Supabase.
   - `ALERTA_CHAVE`: uma senha longa qualquer.
4. **Cadastrar o webhook**, depois do deploy. Coloque as duas `LIVEPIX_CLIENT_*` no `.env.local` e eu rodo `node scripts/livepix-webhook.mjs https://painel-obs-unidade-secreta.vercel.app/api/livepix/webhook`.
5. **No OBS,** adicionar a fonte `https://painel-obs-unidade-secreta.vercel.app/alerta?sessao=ID&chave=K`, em 1920×1080, por cima das cenas.

Enquanto a 0007 não roda, o painel local também não mostra a lista de apoios, porque o dev usa o mesmo banco de produção.
