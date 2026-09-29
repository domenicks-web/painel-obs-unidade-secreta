# Unidade Secreta Live

Painel web para controlar os overlays de OBS da Unidade Secreta em tempo real, de qualquer lugar, de graça.

## Como funciona

- `/tela/:id` — as 9 telas (`inicio`, `host`, `futebol`, `filme`, `mesa`, `intervalo`, `lower`, `tecnico`, `fim`). É a URL que entra na fonte Navegador do OBS. Fundo transparente.
- `/painel` — onde a galera edita as infos das telas, o PIX manual e a galera (precisa de login). A troca de cena é no OBS.
- `/admin` — convidar gente nova e definir o papel (admin/editor).
- `/login` — entrada com e-mail e senha.

## 1. Criar o projeto no Supabase

1. Crie uma conta grátis em supabase.com e um novo projeto.
2. Em SQL Editor, rode nesta ordem os arquivos de `supabase/migrations/`: `0001_schema.sql`, `0002_funcoes.sql`, `0003_realtime.sql`, `0004_corrige_login.sql`, `0005_telas_novas.sql`. Se você já tinha rodado as anteriores, rode só as que faltam. **A `0005` apaga o estado antigo das cenas** e cria a tabela de PIX.
3. Em Authentication → Sign In / Providers: deixe o provedor **Email ligado** (é ele que faz o login com senha) e **desligue "Allow new users to sign up"**. Não existe tela de cadastro: as contas são criadas pelo admin no Supabase (passos 2 e 5).
4. (Opcional) Em Authentication → URL Configuration, coloque a URL do deploy na Vercel como "Site URL".
5. Em Project Settings → API, copie a "Project URL" e a "anon public key".

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
3. Câmeras, chat e QR code do PIX entram como fontes **acima** da tela, encaixadas nas molduras. No OBS as molduras aparecem vazias (o texto "CÂMERA · 924×520" só aparece na prévia do painel). Tamanhos e posições (em 1920×1080):

   | Tela | Câmeras | Chat |
   |---|---|---|
   | Host, 1 câmera | 924×520 em (60,150); QR 214×214 dentro da caixa laranja | 440×800 em (1420,150) |
   | Host, 2 câmeras | 635×520 em (60,150) e (725,150) | 440×800 em (1420,150) |
   | Host, 3 câmeras | 780×520 em (60,150); 490×235 em (870,150) e (870,435) | 440×800 em (1420,150) |
   | Futebol | 645×400 em (60,200) e (735,200); sem enquete, 645×750 | 440×910 em (1420,40) |
   | Filme/série | 645×340 em (60,130), (735,130), (60,540), (735,540) | 440×750 em (1420,130) |
   | Mesa redonda | 580×326 em (60,160), (670,160), (1280,160), (60,570), (670,570), (1280,570) | — |

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

## 5. Convidar o resto da galera

Para cada pessoa: cadastre o e-mail e o papel (editor ou admin) em `/admin` e crie o login dela no Supabase (Authentication → Users → Add user → Create new user, com "Auto Confirm User" marcado). Passe o e-mail e a senha pra ela. A ordem dos dois passos não importa, o vínculo é automático.

## Desenvolvimento local

```bash
npm install
cp .env.example .env.local # preencha com as chaves do seu projeto Supabase
# as variáveis VITE_* entram no build: mudou na Vercel, precisa fazer redeploy
npm run dev
```

## Testes

```bash
npm run test                 # testes do front (Vitest)
supabase/testes/rodar.sh     # testes do banco: sobe um Postgres 17 no Docker, roda as migrations e os asserts
```

Comparação visual com a referência (com `npm run dev` rodando; precisa do Chromium do Playwright em `~/.cache/ms-playwright`):

```bash
(cd scripts && npm install)
node scripts/comparar-telas.mjs   # 9 prints lado a lado em docs/prints/
node scripts/print-painel.mjs     # painel com o banco simulado
```
