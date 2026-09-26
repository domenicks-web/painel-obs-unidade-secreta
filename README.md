# Unidade Secreta Live

Painel web para controlar os overlays de OBS da Unidade Secreta em tempo real, de qualquer lugar, de graça.

## Como funciona

- `/overlay/:cena?sala=principal` — as cenas (comecando, intervalo, encerramento, jogo, react, nome, alerta). É a URL que entra no Browser Source do OBS.
- `/painel` — onde a galera edita tudo pelo celular (precisa de login).
- `/preview` — grade com todas as cenas em miniatura, pra conferir.
- `/admin` — convidar gente nova e definir o papel (admin/editor).

## 1. Criar o projeto no Supabase

1. Crie uma conta grátis em supabase.com e um novo projeto.
2. Em SQL Editor, rode nesta ordem os arquivos de `supabase/migrations/`: `0001_schema.sql`, `0002_funcoes.sql`, `0003_realtime.sql`.
3. Em Authentication → Providers, confirme que "Email" está habilitado (magic link já vem ligado por padrão).
4. Em Authentication → URL Configuration, adicione a URL do seu deploy na Vercel (passo 3) em "Redirect URLs".
5. Em Project Settings → API, copie a "Project URL" e a "anon public key".

## 2. Virar admin pela primeira vez

Antes de existir alguém no `/admin`, você precisa se cadastrar manualmente como o primeiro admin. No SQL Editor do Supabase:

```sql
insert into public.membros_equipe (email, nome, papel) values ('seu-email@exemplo.com', 'SEU NOME', 'admin');
```

Depois, faça login normalmente pelo `/login` do site com esse e-mail — o vínculo com sua conta acontece automaticamente no primeiro login.

## 3. Subir no GitHub e importar na Vercel

1. `git remote add origin <url-do-seu-repo>` e `git push -u origin main`.
2. Em vercel.com, "Add New Project", importe o repositório.
3. Em Environment Variables, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (os valores copiados no passo 1.5).
4. Deploy. Anote a URL gerada (ex: `https://unidade-secreta-live.vercel.app`).
5. Volte no Supabase (passo 1.4) e confirme essa URL está nas Redirect URLs.

## 4. Configurar no OBS

1. Crie uma cena para cada tela e adicione uma fonte **Navegador**.
2. URL: `https://SEU-DOMINIO.vercel.app/overlay/CENA?sala=principal` (troque CENA por comecando, intervalo, encerramento, jogo, react, nome ou alerta).
3. Largura 1920, altura 1080. Marque "Atualizar navegador quando a cena ficar ativa".
4. No painel do OBS: Docks → Docks de navegador personalizados → cole a URL `https://SEU-DOMINIO.vercel.app/painel` — assim dá pra editar sem sair do OBS.

## 5. Convidar o resto da galera

Em `/admin`, cadastre o e-mail e o papel (editor ou admin) de cada um. Assim que a pessoa fizer login pelo `/login` com aquele e-mail, o acesso já libera.

## Desenvolvimento local

```bash
npm install
cp .env.example .env.local # preencha com as chaves do seu projeto Supabase
npm run dev
```

## Testes

```bash
npm run test
```
