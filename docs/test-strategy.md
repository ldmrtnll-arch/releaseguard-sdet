# Initial Test Strategy

ReleaseGuard treats testability and failure diagnosis as application requirements, not additions made after feature development.

## Phase 1 coverage

- API tests verify liveness and database-backed readiness at the HTTP boundary.
- One critical UI test verifies the meaningful cross-component path: browser to web to API.
- PostgreSQL is real in local and CI test runs; no external public service is involved.

There are no unit tests in this phase because the implemented code has no meaningful pure business rule. Trivial tests would add maintenance without increasing confidence.

## Principles

- Prefer API-based setup as domain features arrive; reserve UI tests for critical user journeys.
- Keep tests deterministic, independent, and safe to execute in parallel.
- Use semantic locators and observable outcomes rather than implementation details.
- Do not use arbitrary sleeps or ordering dependencies.
- CI retries once to collect diagnostic evidence. A pass on retry is treated as flakiness to investigate, not as a fix.
- Capture screenshots and video on failure, and traces on the first retry, to balance diagnosis with artifact size.

## Planned layers

Later phases will add focused unit, integration, direct database, consumer-driven contract, accessibility, visual regression, resilience, and performance tests as the corresponding behavior exists. Each layer must address a distinct risk rather than duplicate another suite.
