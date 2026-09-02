# Test Data Engineering

ReleaseGuard separates mutable scenario data from stable reference data so tests can run concurrently without destructive cleanup.

## Mutable per-test data

Users, subscriptions, and payment idempotency keys belong to individual tests.

`@releaseguard/test-data` generates users with:

```text
test.user.<run-id>.<worker-index>.<counter>@releaseguard.test
```

- The run ID is visible and can be supplied by CI.
- `workerIndex` separates actual Playwright worker processes.
- Each worker owns a monotonically increasing counter.
- `.test` prevents accidental external delivery.
- Explicit overrides support negative inputs without Faker or scenario factories.

`authenticatedUser` registers and logs in a new user. `subscribedUser` builds on it only when an active Starter subscription is a genuine precondition. `authenticatedPage` and `subscribedPage` reuse those API-created states, inject the token into the current tab's `sessionStorage`, reload, and wait for session restoration. All remain test-scoped where state is mutable; the builder remains worker-scoped.

Browser storage state is deliberately not used for authentication because Playwright storage state does not persist `sessionStorage`. An initialization script is also avoided so logout tests cannot accidentally have the token injected again on navigation.

A subscription-input builder was intentionally not added because `{ planId }` has no meaningful generation behavior.

The worker-scoped payment-key builder emits:

```text
payment.<run-id>.<worker-index>.<counter>
```

Retries deliberately reuse that key; separate logical payment attempts receive new keys. This makes replay and concurrency assertions deterministic without globally clearing provider state.

## Shared reference data

Plans are immutable, versioned reference data:

- `starter`
- `professional`
- `business`

They are inserted by migration with deterministic UUIDs and resolved in tests by code. Specs never hardcode plan UUIDs or generate random plans. Sharing these read-only rows is safe across workers and makes the product catalog deterministic.

## Cleanup

The strategy remains append-only identity isolation:

- Local runs create uniquely named users and their subscription history.
- CI owns an ephemeral PostgreSQL service and discards it after the job.
- Developers may intentionally reset only the ReleaseGuard Compose volume.

Tests do not truncate global tables or expose reset endpoints. This avoids cross-worker cleanup races.

## Failure observability

Generated emails and payment keys identify the run, worker, and sequence. Subscription responses expose their ID and embedded plan code, while provider inspection exposes attempts and correlated request IDs.

## Anti-patterns avoided

- Shared accounts and shared mutable subscriptions.
- Random plan generation or mutation.
- Global database resets during parallel execution.
- Faker for simple deterministic values.
- Direct database mutation for business setup.
- Assertions inside clients or fixtures.
- Sleeps and test-order dependencies.
