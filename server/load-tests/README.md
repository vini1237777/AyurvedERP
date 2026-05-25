# Load tests

Three k6 scripts to demonstrate the system's scaling story end-to-end.

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

## Measured results (4-core MacBook, local Postgres + Redis + cluster)

| Scenario             | VUs  | Throughput  | p95     | Error rate |
| -------------------- | ---- | ----------- | ------- | ---------- |
| User journey         | 500  | 378 req/s   | 47 ms   | 0%         |
| User journey         | 2000 | 1146 req/s  | 2.08 s  | 0%         |
| User journey         | 4000 | 707 req/s   | 10.36 s | 1.04%      |
| Cache validation     | 50   | 467 req/s   | 6.34 ms | 0.02%      |

The saturation knee sits at ~2000 VUs / ~1150 req/s. Past that, DB connection
pool contention drives throughput down and errors up.

At 0.075 req/s per active user (the journey's traffic profile), 1146 req/s maps
to ~15,300 active concurrent users per 4-core box. Reaching 100k active users
requires ~7 boxes behind a load balancer with shared Redis and Postgres read
replicas.
