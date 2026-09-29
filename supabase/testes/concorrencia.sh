#!/usr/bin/env bash
# Dois PIX gravados ao mesmo tempo (duas sessões): a meta tem que somar os dois.
# Chamado pelo rodar.sh com o nome do container já com as migrations aplicadas.
set -euo pipefail
NOME=$1
psql_() { docker exec -i "$NOME" psql -U postgres -h 127.0.0.1 -v ON_ERROR_STOP=1 -qAt "$@"; }
psql_ <<'SQL'
delete from public.pix;
update public.salas set estado = estado || '{"ajuste": 5}' where slug = 'principal';
SQL
# sessão 1 segura a transação por 2 s depois de inserir; a sessão 2 insere no meio
psql_ -c "begin; insert into public.pix (nome, valor, origem) values ('A', 10, 'manual'); select pg_sleep(2); commit;" >/dev/null &
sleep 0.5
psql_ -c "insert into public.pix (nome, valor, origem) values ('B', 20, 'manual');" >/dev/null
wait
META=$(psql_ -c "select estado->>'metaAtual' from public.salas where slug = 'principal'")
if [ "$META" != "35" ] && [ "$META" != "35.00" ]; then
  echo "FALHOU: PIX simultâneos, meta = $META (esperado 35)"; exit 1
fi
