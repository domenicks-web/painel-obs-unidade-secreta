# Unidade Secreta Live

Painel web para controlar os overlays de OBS da Unidade Secreta em tempo real, de qualquer lugar, de graça.

## Como funciona

- `/tela/:id` — as 9 telas (`inicio`, `host`, `futebol`, `filme`, `mesa`, `intervalo`, `lower`, `tecnico`, `fim`). É a URL que entra na fonte Navegador do OBS. Fundo transparente.
- `/chat?sessao=ID` — o chat (YouTube, Twitch e TikTok juntos, via Social Stream Ninja), fonte Navegador acima das telas. Fundo transparente. `/chat?teste=1` abre a página de teste com mensagens fictícias.
- `/alerta?sessao=ID&chave=K` — alerta de superchat, super sticker e membro novo do YouTube, por cima de tudo (o de PIX é o widget do LivePix). `/alerta?teste=1` abre a página de teste.
- `/painel` — onde a galera edita as infos das telas, os apoios (PIX, superchat, membro) e a galera (precisa de login). A troca de cena é no OBS.
- `/admin` — convidar gente nova e definir o papel (admin/editor).
- `/login` — entrada com e-mail e senha.

## 1. Criar o projeto no Supabase

1. Crie uma conta grátis em supabase.com e um novo projeto.
2. Em SQL Editor, rode nesta ordem os arquivos de `supabase/migrations/`: `0001_schema.sql`, `0002_funcoes.sql`, `0003_realtime.sql`, `0004_corrige_login.sql`, `0005_telas_novas.sql`, `0006_livepix_controle.sql`, `0007_apoios.sql`. Se você já tinha rodado as anteriores, rode só as que faltam. **A `0005` apaga o estado antigo das cenas**; a `0007` transforma a tabela de PIX na tabela única de apoios (os PIX que já existem continuam).
3. Em Authentication → Sign In / Providers: deixe o provedor **Email ligado** (é ele que faz o login com senha) e **desligue "Allow new users to sign up"**. Não existe tela de cadastro: as contas são criadas pelo admin no Supabase (passos 2 e 5).
4. (Opcional) Em Authentication → URL Configuration, coloque a URL do deploy na Vercel como "Site URL".
5. Em Project Settings → API Keys, copie a "Project URL", a chave pública ("publishable"/anon) e a chave secreta ("secret"/service_role). A secreta só vai para o servidor (Vercel), nunca para o front.

## 2. Virar admin pela primeira vez

Antes de existir alguém no `/admin`, você precisa se cadastrar manualmente como o primeiro admin. No SQL Editor do Supabase:

```sql
insert into public.membros_equipe (email, nome, papel) values ('seu-email@exemplo.com', 'SEU NOME', 'admin');
```

Depois crie o login: Authentication → Users → **Add user → Create new user**, com o mesmo e-mail, uma senha e **"Auto Confirm User" marcado**. Pronto, é só entrar em `/login` com esse e-mail e senha. O vínculo com o cadastro acima é automático.

## 3. Subir no GitHub e importar na Vercel

1. `git remote add origin <url-do-seu-repo>` e `git push -u origin main`.
2. Em vercel.com, "Add New Project", importe o repositório.
3. Em Environment Variables, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (os valores copiados no passo 1.5).
4. Deploy. Anote a URL gerada (ex: `https://unidade-secreta-live.vercel.app`).

## 4. Configurar no OBS

1. Crie uma cena para cada tela e adicione uma fonte **Navegador** com `https://SEU-DOMINIO.vercel.app/tela/ID` (troque ID por `inicio`, `host`, `futebol`, `filme`, `mesa`, `intervalo`, `lower`, `tecnico` ou `fim`).
2. Largura 1920, altura 1080. Deixe **desmarcado** "Atualizar navegador quando a cena ficar ativa": o que muda no painel chega sozinho, e os relógios seguem a hora do servidor (abrir a fonte no meio da contagem mostra o mesmo tempo das outras).
3. Câmeras, chat e QR code do PIX entram como fontes **acima** da tela, encaixadas nas molduras. No OBS as molduras aparecem vazias (o texto "CÂMERA · 928×522" só aparece na prévia do painel). Tamanhos e posições (em 1920×1080):

   | Tela | Câmeras (todas 16:9) | Chat |
   |---|---|---|
   | Host, 1 câmera | 928×522 em (60,150); QR 240×320 dentro da caixa laranja | 440×800 em (1420,150) |
   | Host, 2 câmeras | 640×360 em (60,240) e (740,240) | 440×800 em (1420,150) |
   | Host, 3 câmeras | 896×504 em (60,150); 400×225 em (980,150) e (980,429) | 440×800 em (1420,150) |
   | Futebol | 640×360 em (60,200) e (740,200); sem enquete, em (60,370) e (740,370) | 440×800 em (1420,150) |
   | Filme/série | 624×351 em (60,130), (756,130), (60,550), (756,550) | 440×800 em (1420,130) |
   | Mesa redonda | 576×324 em (62,160), (672,160), (1282,160), (62,570), (672,570), (1282,570) | — |

4. **Alerta de PIX:** é o widget do próprio LivePix (fonte Navegador com o link do LivePix), no topo das cenas. O painel só controla ele (ver 4.1).
5. **Lower third** (`/tela/lower`): entra uma vez e fica; quem mostra/esconde é o OBS (atalho ou Modo Estúdio).
6. Troca de cena é sempre no OBS (transição Fita/stinger, Modo Estúdio). O painel só muda as infos.
7. Dá pra usar o painel dentro do OBS: Docks → Docks de navegador personalizados → `https://SEU-DOMINIO.vercel.app/painel`.

## 4.1 Controles do alerta do LivePix (pausar, pular, repetir, limpar fila)

O alerta de PIX com áudio continua sendo o widget do próprio LivePix no OBS. O painel só controla ele (coluna PIX: PAUSAR ALERTAS / RETOMAR, PULAR, REPETIR, LIMPAR FILA).

1. Rode `supabase/migrations/0006_livepix_controle.sql` no SQL Editor do Supabase.
2. No painel do LivePix, em **Controles de Alertas**, copie os links de pausar, retomar, pular, repetir e limpar.
3. Na Vercel, em Environment Variables, adicione `LIVEPIX_URL_PAUSAR`, `LIVEPIX_URL_RETOMAR`, `LIVEPIX_URL_PULAR`, `LIVEPIX_URL_REPETIR` e `LIVEPIX_URL_LIMPAR` (**sem** o prefixo `VITE_`: ficam só no servidor, nunca vão pro navegador). Faça redeploy.
4. Pra testar local, coloque as mesmas cinco variáveis no `.env.local`; o `npm run dev` já atende `/api/livepix/*`.

As chamadas passam por `api/livepix/<comando>` (funções da Vercel): o servidor confere se quem clicou é da equipe e chama o link do LivePix. Os links não dizem se o alerta está pausado, então cada comando aceito fica gravado no banco (`livepix_controle`) e toda a equipe vê o mesmo estado. O selo LIVEPIX do topo mostra o último comando dado (quem e quando aparecem ao parar o mouse em cima). Pausado, o selo fica violeta e o painel mostra a faixa "ALERTAS PAUSADOS · FILA SEGURANDO". Se alguém pausar direto no LivePix, o painel não fica sabendo.

LIMPAR FILA pede confirmação ("LIMPAR FILA?") antes de apagar a fila.

## 4.2 Chat (Social Stream Ninja)

1. Instale a extensão do Social Stream Ninja e abra os chats da live (YouTube, Twitch, TikTok) no navegador, como ela pede. Anote o **ID da sessão** que ela mostra.
2. No popup da extensão, em **⚙️ Mechanics - Connections & Integrations**, ligue **"📡 Send chat messages to API server (for external listeners)"**. No dashboard da extensão ela aparece como "Chat to External Apps (ch 3/4)" e deve ficar *Connected*. Não precisa ligar o "Remote Control API" (controle remoto da extensão): deixe desligado.
   - Com essa opção ligada, a extensão para de mandar o chat para o dock/overlay próprio do Social Stream Ninja. Se usar os dois, ligue também a opção logo abaixo ("also send API-routed chat to normal dock/overlay connections").
3. No OBS, fonte **Navegador** `https://SEU-DOMINIO.vercel.app/chat?sessao=ID`, no tamanho da área do chat de cada cena (440×800 em Host, Futebol e Filme). As mensagens empilham de baixo pra cima.
4. No painel, na primeira vez em cada navegador, cole o mesmo ID no bloco CHAT e clique CONECTAR (fica guardado só naquele navegador; TROCAR no rodapé muda). DESTACAR fixa a mensagem no topo do chat no OBS até alguém clicar TIRAR.

O ID da sessão fica só na URL do OBS e no navegador de quem usa o painel, nunca no estado da live (que as telas leem sem login) nem no código. Não mostre a URL da fonte na live. O servidor do Social Stream Ninja não guarda histórico: quem abre agora vê só o que chegar dali em diante.

## 4.3 Apoios: PIX automático, superchat, super sticker e membro

Tudo cai na tabela `apoios` e aparece na lista **APOIOS** do painel (× para não contar). A **meta** soma todos os apoios em real (PIX + superchat + sticker convertidos) mais o ajuste. O card "ÚLTIMO PIX" do Host continua só com PIX; o "TOP DA LIVE" considera qualquer apoio pago.

**PIX automático (webhook do LivePix)**
1. No painel de desenvolvedores do LivePix, crie um app (client credentials) com os escopos **`messages:read`** e **`webhooks`**. Guarde o client id e o client secret.
2. Na Vercel, crie `LIVEPIX_CLIENT_ID`, `LIVEPIX_CLIENT_SECRET` e `SUPABASE_SERVICE_ROLE_KEY` (a chave secreta do Supabase) e faça redeploy.
3. Cadastre o webhook uma vez (lê o client id/secret do ambiente ou do `.env.local`):
   ```bash
   node scripts/livepix-webhook.mjs https://SEU-DOMINIO.vercel.app/api/livepix/webhook
   node scripts/livepix-webhook.mjs --listar   # confere
   ```
   A cada PIX, o LivePix avisa o site; o servidor confere a mensagem na API do LivePix (o aviso não tem assinatura) e só grava o que a API confirmar. Aviso repetido não duplica. PIX manual continua pelo painel.

**Superchat, super sticker e membro novo (YouTube, pelo Social Stream Ninja)**
- Quem grava é o **painel aberto** (o chat do SSN chega no navegador). Vários painéis abertos não duplicam. Só entra o que chegar com algum painel aberto; no modo teste do chat nada é gravado.
- O valor vai convertido para real pelas cotações de `/api/cambio` (atualiza a cada 6 h; se a fonte cair, usa uma tabela fixa). Moeda que não dá pra reconhecer entra com R$ 0 e aparece com o valor original.
- Twitch e TikTok aparecem só no chat (não viram apoio nem alerta). Aniversário de membro também não.

**Alerta (`/alerta`)**
1. Na Vercel, crie `ALERTA_CHAVE` com uma senha longa qualquer (ex.: `openssl rand -hex 24`) e faça redeploy.
2. No OBS, fonte Navegador `https://SEU-DOMINIO.vercel.app/alerta?sessao=ID&chave=K` (ID do SSN e a `ALERTA_CHAVE`), 1920×1080, no topo das cenas.
3. Um alerta por vez (0,5 s entrando, 6 s na tela, 0,5 s saindo). No primeiro da fila o LivePix é **pausado**, e quando a fila acaba é **retomado**. Se a equipe já tinha pausado o LivePix, o alerta não mexe; se alguém pausar no meio, ele fica pausado. Sem `chave=` na URL, o alerta toca mas não pausa o LivePix.
4. Não mostre essa URL na live (tem o ID do chat e a chave).

## 5. Convidar o resto da galera

Para cada pessoa: cadastre o e-mail e o papel (editor ou admin) em `/admin` e crie o login dela no Supabase (Authentication → Users → Add user → Create new user, com "Auto Confirm User" marcado). Passe o e-mail e a senha pra ela. A ordem dos dois passos não importa, o vínculo é automático.

## Desenvolvimento local

```bash
npm install
cp .env.example .env.local # preencha com as chaves do seu projeto Supabase
# as variáveis VITE_* entram no build: mudou na Vercel, precisa fazer redeploy
npm run dev
```

Em dev, `VITE_SSN_SESSAO` no `.env.local` já preenche a sessão do chat no painel e no `/chat` (no build de produção ela é ignorada: não crie na Vercel).

## Testes

```bash
npm run test                 # testes do front (Vitest)
supabase/testes/rodar.sh     # testes do banco: sobe um Postgres 17 no Docker, roda as migrations e os asserts
```

Comparação visual com a referência (com `npm run dev` rodando; precisa do Chromium do Playwright em `~/.cache/ms-playwright`):

```bash
(cd scripts && npm install)
node scripts/comparar-telas.mjs   # 9 prints lado a lado em docs/prints/
node scripts/print-painel.mjs     # painel com o banco simulado (chat em modo teste)
node scripts/print-chat.mjs       # /chat?teste=1 lado a lado com a referência, com as mesmas mensagens
node scripts/print-alerta.mjs     # /alerta?teste=1 lado a lado com a referência (superchat, sticker, membro)
```
