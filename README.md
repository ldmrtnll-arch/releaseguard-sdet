# ReleaseGuard

ReleaseGuard is an SDET and Quality Engineering portfolio project built around a controlled SaaS subscription platform. The application is deliberately small; the product demonstrated by this repository is the reliable, observable, and maintainable quality-engineering ecosystem around it.

Phase 1 establishes a reproducible foundation: a TypeScript monorepo, Fastify API, React web app, PostgreSQL, Docker Compose, Playwright API and browser tests, and a GitHub Actions quality gate.

## Current architecture

```text
Browser ──> React/Vite web ──> Fastify API ──> PostgreSQL
   │                              ▲
   └──── Playwright UI tests      │
          Playwright API tests ───┘
```

The API exposes a liveness endpoint at `GET /health` and a dependency-aware readiness endpoint at `GET /health/ready`. The home page makes one liveness request and presents the observed API status. No authentication or subscription features are implemented in Phase 1.

## Stack

- Node.js 22+, TypeScript in strict mode, npm workspaces
- Fastify 5 and PostgreSQL 17
- React 19 and Vite 7
- Playwright Test with Chromium
- ESLint, typescript-eslint, and Prettier
- Docker Compose and GitHub Actions

## Requirements

- Node.js 22 or newer
- npm (bundled with Node.js)
- Docker with Compose support

No global application dependencies are required.

## Local setup

1. Create local environment settings if you want to override the documented defaults:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Install pinned dependencies:

   ```powershell
   npm ci
   ```

3. Install the Phase 1 browser once:

   ```powershell
   npx playwright install chromium
   ```

4. Start PostgreSQL:

   ```powershell
   docker compose up -d postgres
   ```

5. Start the API and web application together:

   ```powershell
   npm run dev
   ```

The web application is available at `http://localhost:5173`; the API is at `http://localhost:4000`. PostgreSQL maps host port `5433` to avoid the most common local conflict.

To run the entire containerized stack instead, use `docker compose up --build -d`. This exposes the same application ports. Run `docker compose down` to stop it; add `--volumes` only when you intentionally want to delete local database data.

## Environment variables

| Variable        | Default                    | Purpose                             |
| --------------- | -------------------------- | ----------------------------------- |
| `API_HOST`      | `0.0.0.0`                  | Fastify bind address                |
| `API_PORT`      | `4000`                     | API port                            |
| `CORS_ORIGIN`   | `http://localhost:5173`    | Allowed browser origin              |
| `DATABASE_URL`  | local PostgreSQL on `5433` | API database connection             |
| `VITE_API_URL`  | `http://localhost:4000`    | Browser-visible API base URL        |
| `POSTGRES_PORT` | `5433`                     | Optional Compose host port override |

The checked-in values are development-only defaults. `.env` is ignored; `.env.example` is the configuration contract.

## Quality commands

```powershell
npm run lint
npm run format:check
npm run typecheck
npm run build
npm test
```

`npm test` starts the API and web processes through Playwright, runs the API and UI projects, and shuts those processes down. PostgreSQL must already be healthy. Use `npm run test:api` or `npm run test:ui` for a focused project. Tests contain no fixed sleeps and do not depend on execution order.

## Health semantics

- `GET /health` is liveness: it confirms that the API process can serve requests.
- `GET /health/ready` is readiness: it executes a lightweight PostgreSQL query and returns `503` with a stable error shape if the dependency is unavailable.

This distinction lets local tooling, containers, and CI diagnose an application failure separately from a dependency failure.

## Project roadmap

1. **SDET Foundation** — current phase
2. Authentication and Test Data Engineering
3. Subscription Lifecycle
4. Framework Expansion
5. Integration and Database Testing
6. Contract Testing
7. Advanced Quality (accessibility, visual, resilience)
8. Performance Engineering
9. Test Observability and SDET Tooling
10. GitHub Actions Quality Platform
11. Portfolio Polish

Future phases are roadmap only; their capabilities are not represented as complete today.

See [the architecture notes](docs/architecture.md) and [the test strategy](docs/test-strategy.md) for the decisions behind the foundation.
