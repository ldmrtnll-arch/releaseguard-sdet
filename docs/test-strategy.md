# Test Strategy

ReleaseGuard tests observable behavior at the cheapest useful layer and reserves direct persistence checks for business invariants.

## Current coverage

- Unit tests cover email normalization and the parallel-safe user builder.
- API tests cover health, authentication, public plans, subscription positive/negative behavior, ownership isolation, and the full lifecycle.
- Integration tests cover password hashing, plan reference data, plan-change persistence, cancellation history, and concurrent creation.
- Chromium UI tests cover registration, login, invalid authentication, route protection, session restoration, plan display, subscription creation/change/cancellation/re-subscription, and logout.
- A focused smoke subset covers the home integration, login, plans, and subscription creation on Chromium, Firefox, and WebKit.

## API smoke

`npm run test:smoke` runs eight fast API tests: liveness, readiness, register, login, `/me`, plan listing, subscription creation, and current-subscription retrieval. Negative matrices, cancellation, lifecycle, persistence, and concurrency remain regression/integration coverage.

## Lifecycle and state transitions

Smaller tests isolate each rule. A separate `@lifecycle` scenario proves:

```text
none -> Starter active -> Professional active -> cancelled -> Business active
```

The historical subscription ID is retained after cancellation and the new active subscription receives a new ID.

## Concurrency

The `@concurrency` integration scenario creates one authenticated user and sends two independent subscription requests together. It does not assume which request wins. It requires statuses `201` and `409`, stable code `SUBSCRIPTION_ALREADY_ACTIVE`, and a direct database count of exactly one active row.

## Database verification

Database assertions are selective:

- bcrypt hash instead of plaintext;
- exactly three deterministic plans;
- changed `plan_id` persistence;
- cancelled row and timestamp preservation;
- one-active-subscription invariant after concurrent requests.

All business actions occur through the API. The test database helper performs read-only verification and is not a backdoor setup layer.

## Isolation and parallelism

- Every mutable scenario owns a unique user and subscription state.
- Plans are shared, immutable reference data and are never modified by tests.
- No global reset or table truncation occurs between tests.
- Tests use no arbitrary sleeps and do not depend on order.
- Worker-local counters use `workerIndex`; repeat and multi-worker execution remain collision-safe.

## Suite organization

- `npm run test:unit` — Vitest unit tests.
- `npm run test:api` — Playwright API project only.
- `npm run test:integration` — persistence and concurrency project.
- `npm run test:ui` — complete Chromium UI project.
- `npm run test:ui:smoke` — fundamental Chromium UI journeys.
- `npm run test:ui:regression` — Chromium UI regression scenarios.
- `npm run test:ui:critical` — the browser-only critical lifecycle.
- `npm run test:ui:cross-browser` — smoke on Chromium, Firefox, and WebKit.
- `npm run test:smoke` — fundamental API behaviors tagged `@smoke`.
- `npm test` — migrations, unit, API, integration, and full Chromium UI coverage.

CI separates quality/API work, full Chromium UI coverage, and a Firefox/WebKit smoke matrix. It retries once only to collect diagnostic evidence. Screenshots and video are retained on failure and traces on the first retry. Contract testing, performance, dedicated accessibility auditing, and visual regression are not represented as implemented.
