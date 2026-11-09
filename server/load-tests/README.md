# Load tests

k6 scripts to demonstrate the system's scaling story end-to-end.

## Setup

```bash
brew install k6 redis
brew services start redis
npm run build
```

Make sure the API server is running on port 3000:

```bash
# Single Node process
npm run dev

# Or cluster (forks one worker per CPU)
npm run build && WEB_CONCURRENCY=4 npm run start:cluster
```

## Scenarios

### 1. Login burst (`01-login-burst.js`)

200 VUs hitting `/auth/login` within 30s. Measures the bcrypt-bound cold path.

```bash
k6 run load-tests/01-login-burst.js
```

### 2. Realistic user journey (`02-user-journey.js`)

500 VUs, each logged in, looping refresh → dashboard → invoices → customers with
2–5s think time between actions.

```bash
k6 run load-tests/02-user-journey.js
```

### 3. Cache validation (`03-cache-validation.js`)

50 VUs slamming `/reports/dashboard-summary` for 30s. Validates that the Redis
cache serves repeat requests sub-50ms.

```bash
k6 run load-tests/03-cache-validation.js
```

### 4. Last strip race (`04-last-strip-race.js`)

Many cashiers bill the same batch at the same moment. Set the batch quantity
first, then check the final stock in SQL, because k6 only counts responses.

```bash
k6 run -e BATCH_ID=1 -e ITEM_ID=1 -e CUSTOMER_ID=1 -e CASHIERS=20 load-tests/04-last-strip-race.js
```

### 5. Setup comparison (`run-compare.sh`)

Runs one load against one process without Redis, one process with Redis, and 4 workers with Redis. It only runs against a local database.

```bash
./load-tests/run-compare.sh
```

Latest results and raw output: [`results/results.md`](results/results.md).

## Earlier user journey results

Recorded on a local machine with Postgres, Redis and the cluster. The raw output was not kept, so treat these as notes and prefer the comparison above.

| Scenario             | VUs  | Throughput  | p95     | Error rate |
| -------------------- | ---- | ----------- | ------- | ---------- |
| User journey         | 500  | 378 req/s   | 47 ms   | 0%         |
| User journey         | 2000 | 1146 req/s  | 2.08 s  | 0%         |
| User journey         | 4000 | 707 req/s   | 10.36 s | 1.04%      |
| Cache validation     | 50   | 467 req/s   | 6.34 ms | 0.02%      |

The saturation knee sits at ~2000 VUs / ~1150 req/s. Past that, DB connection
pool contention drives throughput down and errors up.

At 0.075 req/s per active user, the journey's traffic profile, 1146 req/s works out to about 15,300 active users. That is a calculation, not a test with that many users.
