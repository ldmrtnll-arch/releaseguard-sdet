# Test Strategy

ReleaseGuard tests observable behavior at the cheapest useful layer and reserves direct persistence checks for business invariants.

## Current coverage

- Unit tests cover email normalization, parallel-safe user and payment-key builders, retry classification, production test-control safety, and synthetic observability classification/aggregation/Markdown/stable-ID behavior.
- Provider tests cover its HTTP contract, deterministic scenarios, idempotency, and concurrency.
- API tests cover health, authentication, public plans, subscription positive/negative behavior, ownership isolation, and the full lifecycle.
- Integration tests cover password hashing, reference data, subscription history, real provider calls, retry/timeout behavior, approved-payment persistence, and concurrent creation without a double charge.
- Consumer contract tests cover the real payment client's approved, declined, and provider-error expectations; provider verification proves the real HTTP provider still satisfies all three Pact interactions.
- Chromium UI tests cover registration, login, invalid authentication, route protection, session restoration, plan display, subscription creation/change/cancellation/re-subscription, and logout.
- Chromium resilience tests cover unavailable health/plans rendering, invalid-session recovery, payment decline, and provider outage without duplicating service retry semantics.
- Accessibility scans cover six critical anonymous and authenticated states; four selective Linux visual baselines protect high-value layout regions.
- A focused smoke subset covers the home integration, login, plans, and subscription creation on Chromium, Firefox, and WebKit.
- k6 covers DB-backed plans reads, authenticated reads, bcrypt-backed login, and bounded subscription writes with measured latency/error thresholds.
- Playwright observability records logical outcomes and every retry attempt, including synthetic flaky coverage at unit level without adding an intentionally flaky end-to-end test.

## API smoke

`npm run test:smoke` runs eight fast API tests: liveness, readiness, register, login, `/me`, plan listing, subscription creation, and current-subscription retrieval. Negative matrices, cancellation, lifecycle, persistence, and concurrency remain regression/integration coverage.

## Lifecycle and state transitions

Smaller tests isolate each rule. A separate `@lifecycle` scenario proves:

```text
none -> Starter active -> Professional active -> cancelled -> Business active
```

The historical subscription ID is retained after cancellation and the new active subscription receives a new ID.

## Concurrency

The `@concurrency` integration scenario creates one authenticated user and sends two independent subscription requests together. It does not assume which request wins. It requires statuses `201` and `409`, stable code `SUBSCRIPTION_ALREADY_ACTIVE`, exactly one active subscription, one approved database payment, and only one provider authorization.

## Database verification

Database assertions are selective:

- bcrypt hash instead of plaintext;
- exactly three deterministic plans;
- changed `plan_id` persistence;
- cancelled row and timestamp preservation;
- one-active-subscription invariant after concurrent requests.
- approved amount from immutable plan price and provider-payment correlation;
- no local subscription/payment rows after decline, unavailable provider, or timeout.

All business actions occur through the API. The test database helper performs read-only verification and is not a backdoor setup layer.

## Isolation and parallelism

- Every mutable scenario owns a unique user and subscription state.
- Plans are shared, immutable reference data and are never modified by tests.
- No global reset or table truncation occurs between tests.
- Tests use no arbitrary sleeps and do not depend on order.
- Worker-local counters use `workerIndex`; repeat and multi-worker execution remain collision-safe.

## Suite organization

- `npm run test:analyze` — validate the latest Playwright observability JSON and publish compact Markdown.
- `npm run test:summary` — convenience alias for the same analysis/publishing command.

- `npm run test:unit` — Vitest unit tests.
- `npm run test:provider` — independent fake-provider contract and behavior.
- `npm run test:a11y` — six Chromium axe scans using WCAG 2.0/2.1 A and AA tags.
- `npm run test:contract:consumer` — generate the Pact through the production payment client and a Pact mock provider.
- `npm run test:contract:provider` — verify an existing Pact against a real provider HTTP listener.
- `npm run test:contract` — generate a clean Pact and then verify every interaction in order.
- `npm run test:api` — Playwright API project only.
- `npm run test:integration` — persistence and concurrency project.
- `npm run test:perf:smoke` — fast Docker-based performance regression gate with five unique subscription writes.
- `npm run test:perf:load` — manual 50-second controlled read/auth/login load with a 12-VU combined peak.
- `npm run test:ui` — complete Chromium UI project.
- `npm run test:ui:smoke` — fundamental Chromium UI journeys.
- `npm run test:ui:regression` — Chromium UI regression scenarios.
- `npm run test:ui:critical` — the browser-only critical lifecycle.
- `npm run test:resilience` — user-facing failure and recovery scenarios.
- `npm run test:ui:cross-browser` — smoke on Chromium, Firefox, and WebKit.
- `npm run test:ui:firefox:full` — complete Firefox UI project for extended regression validation.
- `npm run test:ui:webkit:full` — complete WebKit UI project for extended regression validation.
- `npm run test:visual` — compare four baselines in the pinned Linux Playwright container.
- `npm run test:visual:update` — deliberately regenerate Linux baselines for review.
- `npm run test:smoke` — fundamental API behaviors tagged `@smoke`.
- `npm test` — contracts, migrations, unit, provider, API, integration, full Chromium UI, and accessibility coverage.

CI separates static/unit quality, API/integration, contract, full Chromium UI, Firefox and WebKit smoke, advanced quality, and performance smoke into branch-protection-ready PR checks. The independent gates run in parallel; a weekly/manual extended workflow runs the same 21 UI cases fully on Chromium, Firefox, and WebKit, while controlled k6 load stays manual. Each Playwright invocation has a distinct JSON/Markdown artifact and an always-run analyzer; the original test step remains authoritative for job failure. V1 deliberately has no cross-job totals or historical trend store. See [CI Quality Platform](ci-quality-platform.md) for exact triggers and evidence policy. Automated accessibility is not a complete assistive-technology or legal audit; visual comparison does not prove functional correctness; UI resilience does not replace service integration tests.

Performance smoke is independent because it requires Docker/k6 and measures a built API rather than correctness test servers. Full load is manual and excluded from `npm test`; shared-runner results detect coarse regressions, not small latency changes or production capacity.
