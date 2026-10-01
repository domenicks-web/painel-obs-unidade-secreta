#!/usr/bin/env bash
# Dois PIX gravados ao mesmo tempo (duas sessões): a meta tem que somar os dois.
# Chamado pelo rodar.sh com o nome do container já com as migrations aplicadas.
set -euo pipefail
NOME=$1
psql_() { docker exec -i "$NOME" psql -U postgres -h 127.0.0.1 -v ON_ERROR_STOP=1 -qAt "$@"; }
psql_ <<'SQL'
delete from public.apoios;
update public.salas set estado = estado || '{"ajuste": 5}' where slug = 'principal';
SQL
# sessão 1 segura a transação por 2 s depois de inserir; a sessão 2 insere no meio
psql_ -c "begin; insert into public.apoios (nome, valor, origem) values ('A', 10, 'manual'); select pg_sleep(2); commit;" >/dev/null &
sleep 0.5
psql_ -c "insert into public.apoios (nome, valor, origem) values ('B', 20, 'manual');" >/dev/null
wait
META=$(psql_ -c "select estado->>'metaAtual' from public.salas where slug = 'principal'")
if [ "$META" != "35" ] && [ "$META" != "35.00" ]; then
  echo "FALHOU: PIX simultâneos, meta = $META (esperado 35)"; exit 1
fi

# Dois "+ gol" ao mesmo tempo (dois painéis): o placar tem que somar os dois.
ANA="select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);"
psql_ -c "$ANA select public.atualizar_estado('principal', '{\"golsA\": 0}');" >/dev/null
psql_ -c "$ANA begin; select public.somar_gol('principal', 'A', 1); select pg_sleep(2); commit;" >/dev/null &
sleep 0.5
psql_ -c "$ANA select public.somar_gol('principal', 'A', 1);" >/dev/null
wait
GOLS=$(psql_ -c "select estado->>'golsA' from public.salas where slug = 'principal'")
if [ "$GOLS" != "2" ]; then
  echo "FALHOU: gols simultâneos, golsA = $GOLS (esperado 2)"; exit 1
fi
