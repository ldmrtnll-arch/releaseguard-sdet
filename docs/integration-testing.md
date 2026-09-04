# Payment Integration Testing

ReleaseGuard uses a deterministic payment boundary without pretending that an
in-process mock is a real integration. A separate Fastify service listens on
port `4100`; the API reaches it over HTTP with the same timeout, retry,
serialization, and request-correlation behavior used by the application.

## Provider contract

`POST /payments/authorize` requires:

- `Idempotency-Key`, between 8 and 128 characters;
- `X-Request-ID`, generated or propagated by Fastify;
- a strict JSON body with `amountCents` as a positive integer, `currency` equal
  to `USD`, and a UUID `customerReference`.

The default result is approved. In non-production test environments,
`X-Test-Payment-Scenario` selects `approved`, `declined`, `server-error`,
`transient-error`, `slow`, or `timeout`. The API only forwards this header when
test controls are enabled, and configuration forces them off whenever
`NODE_ENV=production`.

The inspection endpoint `GET /__test/state/:key` exposes attempts, logical
payments, correlated request IDs, and the stored result. It is a provider test
surface, not an application endpoint.

## Idempotency and retry

The provider stores the request fingerprint before any delayed work starts.
Concurrent calls with the same key and body share the same pending operation and
receive one payment ID. Reusing the key with a different body returns `409`.
Completed approvals and declines replay the original result.

The API makes at most two total attempts. Both attempts use the same
idempotency key, request ID, and body. Only timeouts, connection failures, and
provider `5xx` responses are retryable. A business decline is returned
immediately as `PAYMENT_DECLINED` (`402`). Exhausted technical failures become
`PAYMENT_PROVIDER_UNAVAILABLE` (`503`), and exhausted deadlines become
`PAYMENT_PROVIDER_TIMEOUT` (`504`).

## Transaction and concurrency boundary

Subscription creation reads the price from the selected plan; clients cannot
supply an amount. A transaction-scoped PostgreSQL advisory lock serializes
creation for one user. Inside that boundary the service rechecks the active
subscription, authorizes payment, and atomically inserts the subscription and
approved payment. This deliberately holds a database connection while the
provider call is in flight, a reasonable portfolio trade-off for a short,
bounded request that makes the no-double-charge invariant easy to inspect.

The local transaction cannot atomically include an external HTTP service. If
both API attempts time out, ReleaseGuard rolls back all local rows, but the
provider's delayed operation may eventually complete. A production system
would reconcile that unknown outcome by idempotency key before allowing a new
charge. This document records that distributed-systems boundary instead of claiming
exactly-once delivery.

## Coverage

Provider tests prove strict validation, all deterministic scenarios, replay,
payload conflict, and same-key concurrency. Integration tests prove real plan
pricing, request-ID propagation, decline behavior, stable and transient `5xx`
retry, slow success, timeout rollback, re-subscription, payment persistence, and
concurrent subscription creation without a double charge.

Run the layers independently:

```powershell
npm run test:provider
npm run test:integration
```

No test sleeps to coordinate services, no random failures are injected, and
database access is read-only verification rather than test setup.

## Relationship to contract testing

These integration tests answer whether the real API, payment provider, and database work together at runtime, including timing, retry, idempotency, persistence, and concurrency. The Pact suite answers a narrower compatibility question: whether the provider still satisfies the request and response expectations declared by `PaymentProviderClient`.

Contract tests therefore do not replace this suite. They intentionally omit timeouts, retry sequences, replay semantics, concurrent behavior, health checks, inspection endpoints, and database effects; those behaviors require the real runtime topology exercised here. See [Contract Testing](contract-testing.md) for the boundary contract and evolution policy.

Browser resilience coverage complements these service assertions by checking the human-readable outcome of decline and provider unavailability. It does not repeat or replace the retry, timeout, persistence, or idempotency evidence owned here.
