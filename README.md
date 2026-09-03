# ReleaseGuard

ReleaseGuard is an SDET and Quality Engineering portfolio project built around a controlled SaaS subscription platform. The application is deliberately small; its purpose is to demonstrate reliable, observable, and maintainable quality engineering around a real domain.

Phase 7 adds automated accessibility checks, selective Linux visual baselines, and user-facing resilience coverage to the functional, integration, and contract foundations from previous phases.

## Current architecture

```text
Browser -> React/Vite web -> Fastify API -> Services -> Repositories -> PostgreSQL
                                      \-> HTTP payment client -> Fake Payment Provider
Playwright API tests -> API clients -> Fastify API
                         Fixtures -> test-scoped users and subscriptions
                         DB helper -> selected persistence invariants
Playwright UI tests -> Page Objects -> real browser -> React -> real API
PaymentProviderClient -> Pact mock provider -> generated consumer contract
Generated consumer contract -> Pact verifier -> real Fake Payment Provider over HTTP
Accessibility scans + Visual comparisons + Functional UI -> React application
```

The React application provides registration, login, session restoration, public plans, protected subscription management, logout, and responsive loading/error states. Browser automation exercises these screens against the real API without request mocking. New subscriptions are authorized against an independent deterministic provider before the subscription and approved payment are persisted atomically.

## Implemented API

| Method   | Endpoint                        | Authentication | Purpose                                      |
| -------- | ------------------------------- | -------------- | -------------------------------------------- |
| `GET`    | `/health`                       | Public         | Process liveness                             |
| `GET`    | `/health/ready`                 | Public         | PostgreSQL-backed readiness                  |
| `POST`   | `/api/v1/auth/register`         | Public         | Create a user                                |
| `POST`   | `/api/v1/auth/login`            | Public         | Issue a one-hour JWT                         |
| `GET`    | `/api/v1/auth/me`               | Bearer JWT     | Return the authenticated user                |
| `GET`    | `/api/v1/plans`                 | Public         | List active plans in deterministic order     |
| `GET`    | `/api/v1/plans/:id`             | Public         | Return an active plan                        |
| `POST`   | `/api/v1/subscriptions`         | Bearer JWT     | Create an active subscription                |
| `GET`    | `/api/v1/subscriptions/current` | Bearer JWT     | Return the current active subscription       |
| `PATCH`  | `/api/v1/subscriptions/current` | Bearer JWT     | Change the current plan without billing      |
| `DELETE` | `/api/v1/subscriptions/current` | Bearer JWT     | Cancel while preserving subscription history |

New domain responses use a `{ "data": ... }` envelope. Errors use `{ "error": { "code", "message" } }`. Subscription ownership always comes from the JWT `sub`; request bodies cannot select a user.

The payment provider exposes `GET /health`, `POST /payments/authorize`, and the test inspection route `GET /__test/state/:key` on port `4100`. Subscription creation accepts an optional `Idempotency-Key`. Payment declines return `402`; exhausted provider failures return `503`; exhausted timeouts return `504`.

## Plans and money

Starter, Professional, and Business are versioned reference data with deterministic UUIDs. Prices are stored and exposed as integer USD cents (`900`, `2900`, and `7900`) and the only supported billing interval is `monthly`. Plans are public and read-only; there are no mutation endpoints.

## Subscription rules

- A user may have at most one active subscription.
- The database enforces the invariant with a partial unique index.
- The target plan must exist and be active.
- Changing to the current plan returns `SUBSCRIPTION_ALREADY_ON_PLAN`.
- Cancellation changes state to `cancelled`, records `cancelledAt`, and preserves history.
- A cancelled user can subscribe again to another plan.

## Stack

- Node.js 22+, TypeScript strict, npm workspaces
- Fastify 5, PostgreSQL 17, versioned SQL migrations
- bcrypt and JWT authentication, Zod request validation
- React 19 and Vite 7
- Playwright Test and Vitest
- Pact Specification V4 with Pact JS
- axe-core accessibility scans and Playwright visual comparisons
- ESLint, typescript-eslint, and Prettier
- Docker Compose and GitHub Actions

## Local setup

```powershell
Copy-Item .env.example .env
npm ci
npx playwright install chromium firefox webkit
docker compose up -d postgres
npm run db:migrate
npm run dev
```

The web application runs at `http://localhost:5173`, the API at `http://localhost:4000`, the payment provider at `http://localhost:4100`, and PostgreSQL maps host port `5433`.

For the containerized stack:

```powershell
docker compose up --build -d
```

Compose waits for PostgreSQL, applies all schema and reference-data migrations once, then starts the API and web services.

## Quality commands

```powershell
npm run db:migrate
npm run format:check
npm run lint
npm run typecheck
npm run build
npm run test:unit
npm run test:provider
npm run test:a11y
npm run test:contract:consumer
npm run test:contract:provider
npm run test:contract
npm run test:api
npm run test:integration
npm run test:ui
npm run test:ui:smoke
npm run test:ui:regression
npm run test:ui:critical
npm run test:ui:cross-browser
npm run test:resilience
npm run test:visual
npm run test:visual:update
npm run test:smoke
npm test
```

The default suite contains 97 executable cases: 10 unit, 10 payment-provider, 34 API, 12 integration, three consumer-contract tests, one provider-verification test, 21 Chromium functional UI tests, and six accessibility scans. Four selective visual comparisons run separately in a pinned Linux Playwright container, and four browser smoke scenarios run on each of Chromium, Firefox, and WebKit. Visual baselines stay outside `npm test` because pixel comparison requires the documented Linux environment.

## Test data and isolation

Users, subscriptions, and payment keys are mutable, test-owned data. Each test creates unique values using the run ID, `workerIndex`, and a monotonic counter. Plans are shared immutable reference data resolved by code rather than generated or mutated. There is no shared account, global truncation, or test-order dependency.

See [Accessibility Testing](docs/accessibility-testing.md), [Visual Testing](docs/visual-testing.md), [Contract Testing](docs/contract-testing.md), [Payment Integration Testing](docs/integration-testing.md), [UI Testing](docs/ui-testing.md), [API Testing](docs/api-testing.md), [Test Data Engineering](docs/test-data.md), [Architecture](docs/architecture.md), and [Test Strategy](docs/test-strategy.md).

## Project roadmap

1. SDET Foundation — complete
2. Authentication and Test Data Engineering — complete
3. Subscription Domain and API Automation — complete
4. UI Automation — complete
5. Payment Provider and Integration Testing — complete
6. Contract Testing — complete
7. **Advanced Quality — complete**

Invoices, performance engineering, complete manual accessibility auditing, custom reporting, and flaky analytics are not implemented.
