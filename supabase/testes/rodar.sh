#!/usr/bin/env bash
# Sobe um Postgres 17 descartável, aplica o stub do auth, todas as migrations e os testes.
set -euo pipefail
cd "$(dirname "$0")/../.."
NOME=us-sql-teste
docker rm -f "$NOME" >/dev/null 2>&1 || true
docker run -d --name "$NOME" -e POSTGRES_PASSWORD=teste postgres:17-alpine >/dev/null
trap 'docker rm -f "$NOME" >/dev/null' EXIT
# via TCP só responde depois que o init do container terminou
until docker exec "$NOME" psql -U postgres -h 127.0.0.1 -c 'select 1' >/dev/null 2>&1; do sleep 0.5; done
run() { docker exec -i "$NOME" psql -U postgres -h 127.0.0.1 -v ON_ERROR_STOP=1 -q "$@"; }
run < supabase/testes/stub-auth.sql
for f in supabase/migrations/*.sql; do run < "$f"; done
for f in supabase/testes/0*.sql; do run < "$f"; done
supabase/testes/concorrencia.sh "$NOME"

echo "SQL OK"
