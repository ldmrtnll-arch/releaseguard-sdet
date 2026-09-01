# Test Data Engineering

## Goals

ReleaseGuard test data must be isolated, parallel-safe, diagnosable, and reproducible from observable context. Each test creates the state it needs and no test relies on a previously seeded user.

## User strategy

`@releaseguard/test-data` exports `createUserBuilder` and a convenient default `buildUser`. The contextual builder produces:

```text
test.user.<run-id>.<worker-index>.<counter>@releaseguard.test
```

- Playwright creates one visible run ID and shares it with workers.
- Each worker receives its own monotonically increasing counter.
- `.test` is reserved for synthetic data and requires no external service.
- The valid default password is artificial and can be overridden.
- Partial overrides make invalid-email, missing-field, and password-policy scenarios readable.

Providing `TEST_RUN_ID` makes the naming context explicit in CI or during diagnosis. The builder is deterministic for a given run ID, worker index, and call order; uniqueness across ordinary executions comes from Playwright's generated run ID.

## Fixtures and clients

The worker-scoped `userBuilder` preserves unique sequencing across tests assigned to the same process. `authApi` exposes register, login, and `/me` while preserving raw Playwright responses, so tests can deliberately inspect 4xx responses. `authenticatedUser` generates, registers, logs in, and returns the data, public user, and access token.

Assertions remain in tests. Test helpers do not convert expected HTTP failures into exceptions.

## Cleanup

ReleaseGuard currently uses identity isolation rather than per-test deletion:

- Local tests create unique users in the developer-owned PostgreSQL volume.
- CI provisions an exclusive PostgreSQL service and discards the job with all data.
- The same suite can execute concurrently and repeatedly without depending on old rows.

This avoids cleanup races that could delete another worker's data. A future entity graph may justify transaction-aware or targeted cleanup, but Phase 2 does not introduce it prematurely. Developers can intentionally reset the local database with `docker compose down --volumes`; tests never do this automatically.

## Anti-patterns avoided

- Shared or pre-seeded test accounts.
- Execution-order dependencies.
- Production-like hardcoded identities.
- Uncontrolled `Math.random()` values.
- Destructive public test endpoints.
- Assertions hidden inside API clients or fixtures.
- Global table truncation while parallel workers are active.
