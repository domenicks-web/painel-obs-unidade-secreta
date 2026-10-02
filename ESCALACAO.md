# Tarefa: tela de ESCALAÇÃO (cena Futebol) + cadastro de times

Repo: `painel-obs-unidade-secreta` (main). Trabalhe sozinho até o fim: o dono vai estar fora. **Não pare pra fazer perguntas.** Quando tiver dúvida, escolha a opção mais simples que siga a referência e anote a decisão em `PENDENCIAS.md`.

## Referência (visual = especificação)

`referencia/Tela Escalacao.dc.html`. Abra no navegador junto com `support.js` e `Slot Camera.dc.html`, que já estão em `referencia/`. Porte as cores, fontes, tamanhos e posições **idênticos**. A lógica de layout está na classe do arquivo (`FORMACOES`, `linhas()`, `camsLista()`, `camsCampo()`, `tokens()`): porte essas funções para o código real.

- **1a / 1b:** LISTA, só casa, 4 e 6 câmeras
- **1c / 1d:** LISTA, casa + visitante, 4 e 6 câmeras
- **2a:** configurável pelos Tweaks (é o comportamento esperado)
- **2b:** CAMPO, casa + visitante, 6 câmeras
- **2c:** CAMPO, só visitante, 5 câmeras
- **2d:** LISTA, só visitante

O placar, o relógio, o chat (440×910, reservado e não desenhado) e o ticker são os mesmos da cena Futebol que já existe. **Reaproveite os componentes, não duplique.**

## 1. Nova tela `/tela/escalacao`

Fundo transparente, 1920×1080, lendo o mesmo estado "live" via Supabase Realtime (placar, relógio, `jogo`, ticker, nomes das câmeras).

### Novos campos no estado

- `escModo`: `"lista"` | `"campo"`
- `escTimes`: `"casa"` | `"ambos"` | `"visitante"`
- `escTimeCasaId`, `escTimeVisitId`: referência ao cadastro (seção 3)
- `escFormCasa`, `escFormVisit`: chave de `FORMACOES`
- `escPosCasa`, `escPosVisit`: `null` ou array de 11 `{x,y}` normalizados de 0 a 1 (posições arrastadas à mão)
- `escCams`: 2 a 6

`timeA` e `timeB` do placar devem vir do nome dos times escolhidos, quando houver. Continuam editáveis.

### Regras

- A **formação** reparte os 11 titulares, que ficam na ordem do cadastro (goleiro primeiro), em linhas. **Trocar a formação redistribui na hora**, tanto na lista quanto no campo.
- **LISTA:** coluna(s) agrupadas por linha (goleiro, defesa, meio, ataque), com o técnico no rodapé. Com 1 time, a coluna fica à esquerda e as câmeras no meio. Com 2 times, uma coluna de cada lado e as câmeras no meio.
- **CAMPO:** o campo fica em cima (60,222 · 1320×430) com uma faixa do time acima dele (nome, esquema, técnico). As câmeras ficam numa fileira embaixo (y=690, altura máx. 210, centralizadas).
  - Com 1 time, ele ocupa o campo todo atacando para a direita. Isso vale também para "só visitante", que usa a cor violeta.
  - Com 2 times, a casa fica à esquerda e o visitante espelhado à direita.
- Cores: casa `#FF6B1F`, visitante `#8B6CF0`.
- Nomes longos são cortados com `…`, nunca quebram linha.
- No CAMPO, os jogadores ocupam a altura toda do campo (`y = 30 + (i+.5)/k × (430−60)`). Em linhas com 5 ou mais jogadores, alterne a posição em ziguezague no eixo x: ±48px com 1 time e ±46px com 2 times, com as alas para frente. Com 2 times, o nome fica limitado a 112px de largura (com 1 time, 150px) e é cortado com `…`. Assim nenhum nome fica embaixo da bolinha seguinte.

### Formações (todas no select)

```
4-4-2, 4-3-3, 4-2-3-1, 4-1-4-1, 4-5-1, 4-4-1-1, 4-3-1-2, 4-1-2-1-2 (losango),
4-2-2-2, 4-3-2-1, 4-2-4, 4-1-3-2, 3-5-2, 3-4-3, 3-4-2-1, 3-4-1-2, 3-1-4-2,
3-6-1, 5-3-2, 5-4-1, 5-2-3, 5-2-1-2
```

Valide que cada formação soma 10 jogadores de linha. Isso também entra no teste.

## 2. Painel

Adicione a tela "ESCALAÇÃO" na lista de telas do painel, com prévia real (mesmo componente da URL do OBS) e os campos abaixo.

- **Escalação:** segmentado `LISTA | CAMPO`
- **Times:** segmentado `SÓ CASA | CASA E VISITANTE | SÓ VISITANTE`
- **Time casa / Time visitante:** select vindo do cadastro. Só aparece o lado que está em uso.
- **Formação casa / visitante:** select com todas as formações
- **Câmeras:** 2 a 6

### Editor de jogadores (só no modo CAMPO)

Funciona igual ao editor de molduras que já existe: botão "EDITAR POSIÇÕES", depois arrastar as bolinhas na prévia 16:9.

- Salva em `escPosCasa` / `escPosVisit` (0–1, sempre na perspectiva de quem ataca pra direita; espelhe na hora de renderizar o visitante em "ambos").
- Limite as posições à área do campo.
- Botão "RESETAR FORMAÇÃO" volta para `null`, ou seja, para as posições calculadas.
- Trocar a formação também reseta as posições manuais (com aviso).

### Câmeras

As câmeras da escalação usam o editor de molduras por cena que já existe. Os layouts de `camsLista` / `camsCampo` são o padrão inicial, gerado ao trocar a quantidade de câmeras ou o modo. Depois, o editor permite ajustar.

## 3. Cadastro de times

Crie a migration `supabase/migrations/0012_times.sql` (a 0008 já existia):

- `times`: `id`, `nome`, `sigla`, `tecnico`, `cor` (opcional), `created_at`
- `jogadores`: `id`, `time_id` (FK com cascade), `numero` (int), `nome` (apelido de camisa), `titular` (bool), `ordem` (int; titulares: 1 = goleiro, 2–11 na ordem da formação: defesa da direita pra esquerda, depois meio, depois ataque)
- RLS igual às outras tabelas: as telas leem sem login, só o painel logado escreve.

### Tela no painel "TIMES"

- Criar, editar e excluir time (nome, técnico)
- Elenco com número e nome, marcar titular, reordenar arrastando
- Exigir exatamente 11 titulares para poder usar o time na escalação. Mostre o contador "9/11".
- Botão "COLAR ELENCO": um textarea com uma linha por jogador, no formato `numero nome`. As 11 primeiras linhas viram titulares.

### Seed

Use os elencos de exemplo da referência (BRASIL, CORINTHIANS, PALMEIRAS: números, nomes e técnico estão na classe do arquivo) e um time "ÍNDIA" com 11 jogadores "JOGADOR 1…11" numerados 1–11 e técnico "A DEFINIR". Assim o dono só edita. Avise em `PENDENCIAS.md` que os elencos são exemplos.

## 4. Testes e processo

1. Crie a branch `escalacao`.
2. Testes unitários:
   - todas as formações somam 10
   - `linhas()` reparte certo
   - `camsLista` / `camsCampo` nunca saem de 1920×1080 nem invadem o chat (x+w ≤ 1380) nem o ticker (y+h+50 ≤ 1000) para 2–6 câmeras em todos os modos
   - nenhuma bolinha sai do campo (incluindo posições manuais nos limites)
   - espelhamento do visitante
   - validação de 11 titulares
3. Rode a suíte inteira. Os 316 testes atuais precisam continuar passando.
4. Rode o build e abra `/tela/escalacao` local nos 8 casos (lista/campo × casa/ambos/visitante, mais 4 e 6 câmeras). Compare com a referência (screenshot, se tiver ferramenta) e corrija as diferenças.
5. Migration: se o Supabase CLI estiver linkado, aplique a 0012. Se não, deixe em `PENDENCIAS.md` o comando exato e **não faça merge**.
6. Com migration aplicada, testes verdes e build ok: faça o merge na main (deploy Vercel). **Não pode quebrar nenhuma tela existente**, porque tem live amanhã às 10h30. Na dúvida, deixe na branch e explique.
7. Atualize o `PENDENCIAS.md` com:
   - o que foi feito
   - decisões tomadas
   - a URL nova para adicionar no OBS (fonte de navegador 1920×1080 `/tela/escalacao`, cena "ESCALAÇÃO")
   - o que falta
