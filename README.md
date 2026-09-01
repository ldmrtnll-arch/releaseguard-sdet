# ReleaseGuard

ReleaseGuard is an SDET and Quality Engineering portfolio project built around a controlled SaaS subscription platform. The application is deliberately small; its purpose is to demonstrate reliable, observable, and maintainable quality engineering around a real domain.

Phase 3 adds immutable plan reference data, the complete subscription lifecycle, and a professional API automation layer to the authentication and test-data foundation from the previous phases.

## Current architecture

```text
Browser -> React/Vite web -> Fastify API -> Services -> Repositories -> PostgreSQL
Playwright API tests -> API clients -> Fastify API
                         Fixtures -> test-scoped users and subscriptions
                         DB helper -> selected persistence invariants
```

The web application continues to expose the health integration. Login, plans, and subscription screens are intentionally reserved for Phase 4.

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
- ESLint, typescript-eslint, and Prettier
- Docker Compose and GitHub Actions

## Local setup

```powershell
Copy-Item .env.example .env
npm ci
npx playwright install chromium
docker compose up -d postgres
npm run db:migrate
npm run dev
```

The web application runs at `http://localhost:5173`, the API at `http://localhost:4000`, and PostgreSQL maps host port `5433`.

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
npm run test:api
npm run test:integration
npm run test:ui
npm run test:smoke
npm test
```

The current suite contains 44 tests: 4 unit, 34 API, 5 database integration, and 1 UI test. The API smoke suite contains 8 tests covering health, authentication, plan listing, subscription creation, and current subscription retrieval.

## Test data and isolation

Users and subscriptions are mutable, test-owned data. Each test creates a unique user using the run ID, `workerIndex`, and a monotonic counter. Plans are shared immutable reference data resolved by code rather than generated or mutated. There is no shared account, global truncation, or test-order dependency.

See [API Testing](docs/api-testing.md), [Test Data Engineering](docs/test-data.md), [Architecture](docs/architecture.md), and [Test Strategy](docs/test-strategy.md).

## Project roadmap

1. SDET Foundation — complete
2. Authentication and Test Data Engineering — complete
3. **Subscription Domain and API Automation — complete**
4. UI Automation — next

Payments, invoices, contract testing, performance, accessibility, visual regression, custom reporting, and flaky analytics are not implemented.
