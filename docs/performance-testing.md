# Performance Testing

## Purpose

ReleaseGuard uses k6 to establish a measured API baseline, catch coarse performance regressions, and observe behavior under moderate controlled load. The tests combine correctness checks with latency, throughput, iteration, VU, and error metrics. They are not a production capacity claim.

## Test environment

The baseline was measured on 2026-09-03 against production-built Docker Compose services:

- ReleaseGuard API on Node.js 22 Alpine, with `NODE_ENV=production`;
- PostgreSQL 17 Alpine and the existing ten-connection application pool;
- the real Fake Payment Provider for subscription writes;
- k6 2.2.0;
- Windows 11 host, 20 logical CPU cores and 31.3 GiB visible memory;
- local Docker networking with no remote application network.

The baseline generator used the official k6 2.2.0 Windows binary against the built API container because Docker Hub authentication was transiently unavailable during measurement. The version-controlled execution path uses the equivalent pinned `grafana/k6:2.2.0` image inside the Compose network.

API request logging remained enabled. No bcrypt cost, database pool, cache, schema, or product behavior was changed for the benchmark.

## Scenarios

### Plans read

`GET /api/v1/plans` exercises a public, deterministic, PostgreSQL-backed read and verifies status 200 plus the expected three-plan shape.

### Authenticated read

`GET /api/v1/auth/me` reuses short-lived setup tokens and verifies a successful current-user response. It measures JWT verification and a user lookup without mixing login cost into every iteration.

### Login

`POST /api/v1/auth/login` rotates through multiple prepared accounts and verifies that an access token is returned. Its threshold is separate because bcrypt cost 12 deliberately makes login CPU-heavy.

### Subscription write smoke

`POST /api/v1/subscriptions` runs five times, once per unique account. It crosses the API, PostgreSQL transaction and real default-approved Payment Provider and verifies a 201 active subscription. Continuous write load is intentionally excluded because repeatedly creating subscriptions is not a realistic lifecycle for one user.

## Workload profiles

The smoke uses fixed iterations with at most five concurrent VUs and normally completes in roughly 2.2 seconds after setup:

| Scenario           | Executor            | VUs | Iterations |
| ------------------ | ------------------- | --: | ---------: |
| Plans read         | `per-vu-iterations` |   1 |          3 |
| Authenticated read | `per-vu-iterations` |   1 |          3 |
| Login              | `per-vu-iterations` |   1 |          2 |
| Subscription write | `shared-iterations` |   2 |          5 |

The load uses three explicit `ramping-vus` scenarios. Each ramps for 10 seconds, holds for 30 seconds and ramps down for 10 seconds:

| Scenario           | Peak VUs | Think time |
| ------------------ | -------: | ---------: |
| Plans read         |        6 |       0.2s |
| Authenticated read |        4 |       0.3s |
| Login              |        2 |       0.5s |

The combined peak is 12 VUs and the measured portion lasts 50 seconds. VUs are concurrent workers, not a direct estimate of real users.

## Test data

`setup()` creates five users for smoke and twelve for load. Accounts follow `perf.user.<run-id>.<index>@releaseguard.test`, share only an artificial test password, and receive independent JWTs. Write iterations use a deterministic run-scoped idempotency key and a unique account, preserving the one-active-subscription invariant.

Setup registration/login requests are visible in global HTTP metrics but excluded from the endpoint-specific custom trends used for baseline thresholds. The database is append-only for local performance runs; no shared database is truncated. CI removes its disposable Compose volume after each job. A smoke run creates five users, five subscriptions and five payments; a load run creates twelve users and no subscription rows.

## Baseline methodology

The API was built and started through Compose, health checks completed, and a discovery smoke warmed the runtime and PostgreSQL plan data. Three unchanged 50-second load runs were then executed. No cache was flushed between runs. Run 1 was selected as representative because its plans p95 (73.54ms) is the median of 72.12ms, 73.54ms and 76.64ms; the best run was not selected.

## Baseline results

Representative load run 1:

| Scenario           | Requests |   RPS |      p50 |      p90 |      p95 |      p99 | Error rate |
| ------------------ | -------: | ----: | -------: | -------: | -------: | -------: | ---------: |
| Plans read         |    1,080 | 19.65 |  30.45ms |  53.56ms |  73.54ms |  80.18ms |      0.00% |
| Authenticated read |      485 |  8.82 |   3.67ms |  81.95ms |  82.55ms | 122.96ms |      0.00% |
| Login              |      126 |  2.29 | 182.87ms | 184.99ms | 185.25ms | 187.01ms |      0.00% |

The full run issued 1,715 HTTP requests at 31.20 requests/second, completed 1,691 measured iterations, reached 12 VUs, passed 100% of checks and recorded zero request failures.

## Threshold derivation

- Plans load p95 measured 73.54ms. The 150ms limit provides about 104% headroom for CI and host contention.
- Authenticated-read load p95 measured approximately 82ms. The 150ms limit provides about 83% headroom.
- Login load p95 measured 184.54ms in the median of the three runs. The 300ms limit provides about 63% headroom while preserving bcrypt cost 12.
- Subscription-write discovery p95 ranged from 362ms to 396ms. The smoke limit is 750ms because five samples execute concurrently across the database/provider boundary and hosted runners vary.
- Every scenario error rate and global HTTP failure rate must stay below 1%; checks must remain above 99%.

Smoke read limits are 300ms rather than 150ms because each trend has only three samples and overlaps with bcrypt and write startup work. It is a coarse PR gate, not a microbenchmark.

## Smoke gate

`npm run test:perf:smoke` builds the application, waits on Compose health checks and runs the pinned k6 image. Any correctness or threshold violation returns a non-zero exit code. The main GitHub Actions workflow runs it for pushes and pull requests and uploads the summary for seven days.

The wrapper removes k6 `setup_data` from the generated summary before it can be uploaded, so ephemeral JWTs and credentials never enter CI artifacts.

## Load workflow

`npm run test:perf:load` executes the versioned 50-second profile. `.github/workflows/performance.yml` exposes it only through `workflow_dispatch`, uploads the summary for 14 days and cleans the disposable stack afterward. Full load is deliberately absent from `npm test` and normal pull requests.

## CI strategy

The PR smoke is intentionally small and uses generous, evidence-based limits suitable for shared runners. The manual load workflow is the controlled regression/capacity experiment. GitHub-hosted variability means these gates detect substantial regressions, not 5ms changes.

## Limitations

- These local results do not represent production capacity.
- VUs do not equal real users.
- The network and database are local/containerized.
- There is no distributed generation, production traffic, soak, stress or spike test.
- The short profile cannot characterize long-term resource leaks.
- Global metrics include setup requests; scenario tables use isolated custom metrics.
- No server-side CPU/memory time series was collected, so bottleneck conclusions remain conservative.

## How to run

```powershell
npm run test:perf:smoke
npm run test:perf:load
```

Both commands are Windows-friendly and default to Docker, so no global k6 installation is required. For diagnostics with an optional local k6 2.2.0 binary, set `K6_EXECUTION=local` and optionally `K6_BINARY`; the same wrapper still builds the API, sanitizes the result and restores the local stack.

## How to interpret results

Use endpoint custom metrics for comparisons: `plans_duration`, `authenticated_read_duration`, `login_duration`, and `subscription_write_duration`. Review p50 for typical response time, p95/p99 for tail behavior, counters/RPS for delivered work, and both checks and error rates for correctness. A higher VU count alone does not prove higher supported user capacity.

## Anti-patterns avoided

- no invented thresholds or health-only benchmark;
- no single shared account bottleneck;
- no full load on every PR;
- no claim that VUs equal users or that a laptop result is production capacity;
- no bcrypt weakening, synthetic cache or unmeasured pool tuning;
- no random workload branching;
- no destructive cleanup of a shared database;
- no requests accepted without correctness checks;
- no dashboard, APM or custom reporting framework.
