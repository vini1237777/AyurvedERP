# Read throughput comparison

Measured on 2026-11-09 with `load-tests/run-compare.sh`, from commit `957d602`. The raw k6 summaries are in this folder.

| Setup | Runs | Median req/s | Range req/s | Median p95 | Failed |
|---|---|---|---|---|---|
| One process, no Redis | 3 | 118 | 117 to 124 | 1,230 ms | 0% |
| One process, Redis | 3 | 506 | 456 to 545 | 251 ms | 0% |
| 4 workers, Redis | 3 | 1,145 | 1,092 to 1,216 | 128 ms | 0% |

## How it was measured

- 100 virtual users for 30 seconds with no pause between requests, per run.
- Each request is picked at random from `reports/dashboard-summary`, `customers` and `items`.
- The Redis database is emptied before each run, so each run starts with a cold cache.
- "No Redis" points at a closed port, which is how the app behaves when Redis is down.

## What this does not show

- **Laptop, not production.** An Apple M2 with 8 cores and 8 GB of RAM ran k6, the API, Postgres and Redis together.
- **Reads only.** These three routes are cached. Billing writes go to Postgres and are covered by `04-last-strip-race.js`.
- **Small data.** The local database has 200 customers, 200 items and 204 invoices.
- **Short runs.** Three runs of 30 seconds show the difference between setups, not long term stability.
