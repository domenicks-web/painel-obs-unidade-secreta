# Unidade Secreta Live

Painel web para controlar os overlays de OBS da Unidade Secreta em tempo real, de qualquer lugar, de graça.

## Como funciona

- `/tela/:id` — as 9 telas (`inicio`, `host`, `futebol`, `filme`, `mesa`, `intervalo`, `lower`, `tecnico`, `fim`). É a URL que entra na fonte Navegador do OBS. Fundo transparente.
- `/alerta` — o alerta de PIX, por cima de tudo. Mostra um PIX por vez (6 s cada), na ordem em que chegaram.
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
   | Futebol | 645×400 em (60,200) e (735,200) | 440×910 em (1420,40) |
   | Filme/série | 645×340 em (60,130), (735,130), (60,540), (735,540) | 440×750 em (1420,130) |
   | Mesa redonda | 580×326 em (60,160), (670,160), (1280,160), (60,570), (670,570), (1280,570) | — |

4. **Alerta de PIX:** uma fonte Navegador `https://SEU-DOMINIO.vercel.app/alerta`, 1920×1080, no topo das cenas (ou numa cena usada como fonte em todas). Som opcional: coloque um arquivo `public/alerta.mp3` antes do deploy e ajuste o volume no mixer do OBS.
5. **Lower third** (`/tela/lower`): entra uma vez e fica; quem mostra/esconde é o OBS (atalho ou Modo Estúdio).
6. Troca de cena é sempre no OBS (transição Fita/stinger, Modo Estúdio). O painel só muda as infos.
7. Dá pra usar o painel dentro do OBS: Docks → Docks de navegador personalizados → `https://SEU-DOMINIO.vercel.app/painel`.

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
node scripts/print-alerta.mjs     # docs/prints/alerta.png (usa /alerta?teste=1, só em dev)
node scripts/print-painel.mjs     # painel com o banco simulado
```
