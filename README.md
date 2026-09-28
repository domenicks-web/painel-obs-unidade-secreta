# Unidade Secreta Live

Painel web para controlar os overlays de OBS da Unidade Secreta em tempo real, de qualquer lugar, de graça.

## Como funciona

- `/overlay/:cena?sala=principal` — as cenas (comecando, intervalo, encerramento, jogo, react, nome, alerta). É a URL que entra no Browser Source do OBS.
- `/painel` — onde a galera edita tudo pelo celular (precisa de login).
- `/preview` — grade com todas as cenas em miniatura, pra conferir.
- `/admin` — convidar gente nova e definir o papel (admin/editor).

## 1. Criar o projeto no Supabase

1. Crie uma conta grátis em supabase.com e um novo projeto.
2. Em SQL Editor, rode nesta ordem os arquivos de `supabase/migrations/`: `0001_schema.sql`, `0002_funcoes.sql`, `0003_realtime.sql`, `0004_corrige_login.sql`. Se você já tinha rodado as três primeiras antes, rode só a `0004`.
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

1. Crie uma cena para cada tela e adicione uma fonte **Navegador**.
2. URL: `https://SEU-DOMINIO.vercel.app/overlay/CENA?sala=principal` (troque CENA por comecando, intervalo, encerramento, jogo, react, nome ou alerta).
3. Largura 1920, altura 1080. Marque "Atualizar navegador quando a cena ficar ativa".
4. No painel do OBS: Docks → Docks de navegador personalizados → cole a URL `https://SEU-DOMINIO.vercel.app/painel` — assim dá pra editar sem sair do OBS.

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
npm run test
```
