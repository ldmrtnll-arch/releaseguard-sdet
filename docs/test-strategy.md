# Test Strategy

ReleaseGuard treats testability, data ownership, and failure diagnosis as application requirements.

## Current coverage

- Unit tests cover email normalization and the behavioral contract of the user-data builder.
- API tests cover health, readiness, registration, login, JWT-protected `/me`, validation, conflicts, normalization, and non-enumerating credential errors.
- One database integration test proves that the persisted password is a salted bcrypt hash rather than plaintext.
- One critical UI test preserves the Browser → Web → API health path from Phase 1.

## Test-data strategy

Every authentication test owns a user generated from run, worker, and counter context. Overrides produce negative inputs without scenario-specific factories. The suite never relies on a seeded account, and parallel workers do not share a mutable counter.

Local data is intentionally append-only because unique identities make tests independent; it can be discarded with the developer-owned Compose volume. CI uses a database exclusive to the job and discards it when the job ends. There is no public reset endpoint.

## Smoke and regression

`@smoke` covers liveness/readiness, register, login, `/me`, and the web health path. Validation, duplicate, normalization variants, invalid tokens, and security cases are regression-focused. `@security` identifies credential-enumeration, invalid-token, and password-storage risks.

## Fixture philosophy

Fixtures compose one responsibility at a time. `authApi` wraps HTTP operations without assertions. `userBuilder` is worker-scoped and owns unique sequencing. `authenticatedUser` performs only register/login setup. `database` exposes a narrow persistence query for an integration assertion; it is not a general database-testing framework.

## Reliability principles

- Keep tests deterministic, independent, parallel-safe, and behaviorally named.
- Prefer API setup; reserve UI tests for critical user journeys.
- Use semantic locators and public contracts rather than implementation details.
- Do not use arbitrary sleeps or test ordering.
- CI retries once to gather diagnostic evidence, never to redefine an unstable test as healthy.
- Capture screenshots/video on failure and traces on first retry.

Contract, broader database integration, accessibility, visual, resilience, and performance layers will be introduced only with their corresponding product risks.
