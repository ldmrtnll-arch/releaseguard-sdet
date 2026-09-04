# ReleaseGuard Interview Demo

This walkthrough presents the strongest Quality Engineering decisions in roughly 5–10 minutes. It uses only synthetic data and repository-owned services.

## 1. Start the stack

```powershell
npm ci
docker compose up --build -d
docker compose ps
```

Expected: PostgreSQL, Payment Provider, API, and web report healthy; the one-shot migration service exits successfully after migrations `001`–`004`.

## 2. Show the application

Open `http://localhost:5173`. Register a synthetic account, sign in, inspect plans, choose Starter, change to Professional, cancel, subscribe again, and sign out. Point out that the UI is deliberately small because the portfolio focus is the surrounding quality system.

For a repeatable automated version of the central register → login → subscribe → change → cancel journey:

```powershell
npm run test:ui:critical
```

The remaining re-subscription and logout behaviors are independently covered by the full UI suite.

## 3. Show API and integration depth

```powershell
npm run test:api
npm run test:integration -- --grep "recovers from one transient failure"
```

Expected: the API suite exercises positive, negative, ownership, security, and lifecycle behavior. The focused integration test shows a transient provider failure being retried with the same idempotency key before one local payment is persisted.

## 4. Show the concurrency invariant

```powershell
npm run test:integration -- --grep "allows only one active subscription"
```

Expected: two simultaneous requests return one `201` and one `409`, with one active subscription, one approved payment row, and one provider authorization.

## 5. Show consumer-driven contracts

```powershell
npm run test:contract
```

Expected: three consumer interactions are generated and the real Payment Provider passes verification. Explain that Pact protects compatibility; integration coverage still owns runtime behavior. There is no Pact Broker in this repository.

## 6. Show observability

```powershell
npm run test:analyze
```

Open `test-observability-results/summary.md`. Show logical outcomes, attempts, p95 duration, slow tests, and flaky classification. A pass on retry remains visible as flaky; retries never rewrite history.

## 7. Show the CI strategy

Open [CI Quality Platform](ci-quality-platform.md) or `.github/workflows/ci.yml`. Explain the eight parallel pull-request gates, the weekly/manual full three-browser regression, and the manual-only controlled load.

## What to explain in an interview

- API-first browser setup makes UI tests faster while leaving the user behavior under test in the browser.
- Run/worker/counter identities prevent parallel tests from sharing mutable accounts.
- Contract testing checks compatibility; integration testing checks real runtime cooperation and persistence.
- Deterministic failures make retry, timeout, decline, and idempotency behavior reproducible.
- Retries are diagnostics, not a mechanism for hiding flaky tests.
- Performance limits came from measured baselines; the short PR smoke and controlled load answer different questions.
- Selective database, accessibility, and visual checks maximize signal without duplicating every assertion at every layer.

## Stop the demo

```powershell
docker compose down
```

Use `docker compose down --volumes` only when deliberately discarding ReleaseGuard's local database.
