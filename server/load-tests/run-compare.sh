#!/usr/bin/env bash
# Runs the same k6 load against three setups and keeps the raw summaries.
# Local only: it refuses any DATABASE_URL that is not on localhost.
set -euo pipefail
cd "$(dirname "$0")/.."

set -a; source .env; set +a
case "$DATABASE_URL" in
  *@localhost:*|*@127.0.0.1:*) ;;
  *) echo "Refusing: DATABASE_URL is not local"; exit 1 ;;
esac

PORT=5057
OUT=load-tests/results
RUNS=${RUNS:-3}
REDIS_DB=9
mkdir -p "$OUT"
npm run build >/dev/null

run_setup() {
  local name=$1 redis=$2 entry=$3 workers=$4
  for run in $(seq 1 "$RUNS"); do
    redis-cli -n "$REDIS_DB" flushdb >/dev/null
    PORT=$PORT REDIS_URL=$redis WEB_CONCURRENCY=$workers NODE_ENV=production \
      node "$entry" >/dev/null 2>&1 &
    local pid=$!
    until curl -sf "localhost:$PORT/health" >/dev/null; do perl -e 'select(undef,undef,undef,0.25)'; done
    k6 run --quiet --no-usage-report \
      --summary-export "$OUT/$name-run$run.json" \
      -e BASE="http://localhost:$PORT/api" load-tests/05-throughput-compare.js >/dev/null || true
    pkill -P "$pid" 2>/dev/null || true
    kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
    perl -e 'select(undef,undef,undef,2)'
    echo "finished $name run $run"
  done
}

run_setup single-no-redis "redis://127.0.0.1:1" dist/app.js 1
run_setup single-redis "redis://127.0.0.1:6379/$REDIS_DB" dist/app.js 1
run_setup cluster-redis "redis://127.0.0.1:6379/$REDIS_DB" dist/cluster.js 4
redis-cli -n "$REDIS_DB" flushdb >/dev/null
node load-tests/summarize-compare.js "$OUT"
