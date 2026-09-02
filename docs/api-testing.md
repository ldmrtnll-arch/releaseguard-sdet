# API Testing in ReleaseGuard

The framework distinguishes endpoint calls from API Quality Engineering by making ownership, state, contracts, negative behavior, persistence, concurrency, and external-service behavior explicit.

## Layering

```text
Specs -> API clients -> Fastify routes -> domain services -> repositories -> PostgreSQL
   \-> fixtures and builders
   \-> selective read-only DB helper
```

- `AuthApiClient`, `PlansApiClient`, and `SubscriptionsApiClient` centralize paths, payloads, optional Bearer headers, and payment test controls. `PaymentProviderApiClient` addresses the independent provider directly.
- Clients return raw Playwright responses. A 4xx response is testable data, not an exception.
- Fixtures compose users, authentication, immutable plan lookup, and optional subscribed state.
- Specs own status, content-type, body, contract, and stable error-code assertions.
- Small Zod schemas validate meaningful public Plan and Subscription shapes without copying every implementation detail.

## Test isolation

Each mutable scenario creates a unique user. Its subscriptions are therefore isolated by ownership. Plans are shared reference data because tests only read them. No test relies on an earlier test, shared account, or global database reset.

## Negative testing

The suite covers:

- missing and invalid authentication;
- invalid UUIDs and unknown plans;
- strict payload rejection, including an attempted foreign `userId`;
- duplicate active subscription conflicts;
- missing current subscriptions;
- same-plan changes;
- cross-user isolation.

Stable error codes are the primary assertion contract; human messages can evolve without breaking every test.

## State transitions

Focused cases test creation, retrieval, plan change, cancellation, and repeated cancellation. A critical lifecycle case proves active → changed plan → cancelled → active again while preserving the old record.

## Database verification

Tests act through the public API. The database helper reads only the small set of facts that an API response cannot prove alone: persisted plan ID, retained cancellation history, seeded reference rows, password hash, and active-row count after a race.

This avoids coupling every test to storage while still testing the database guarantees that matter.

## Concurrency

Two create requests are issued concurrently for the same authenticated user. The test accepts either request as the winner, expects one `201` and one `409`, then verifies exactly one active database row. The application maps PostgreSQL unique violation `23505` for the named partial index to `SUBSCRIPTION_ALREADY_ACTIVE`.

Phase 5 also verifies one approved database payment and one provider authorization. The API takes a transaction-level advisory lock before its active-state check and external authorization, preventing two concurrent requests for the same user from both charging.

## Anti-patterns avoided

- Shared mutable accounts.
- Database reset between tests.
- Sleeps or timing-based ordering.
- Assertions hidden inside API clients.
- Direct database mutation to construct business state.
- Test-order dependencies.
- Assuming which concurrent request wins.
