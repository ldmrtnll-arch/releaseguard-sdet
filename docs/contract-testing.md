# Contract Testing

## Purpose

ReleaseGuard uses consumer-driven contract testing to protect the HTTP boundary between the ReleaseGuard API and its payment dependency. The contract answers: **does the payment provider still satisfy the behavior the consumer actually uses?** It adds fast compatibility feedback without claiming that two services will operate correctly together under real runtime conditions.

## Consumer and provider

- **Consumer — `ReleaseGuard API`:** specifically the production `PaymentProviderClient`, including its real request serialization, response parsing, and error mapping.
- **Provider — `ReleaseGuard Payment Provider`:** the independent Fastify fake in `apps/payment-provider`. Although controlled by this repository, it represents an external dependency behind a real HTTP boundary.

Names are stable because they are contract identities. Renaming either is a contract-history decision, not a cosmetic refactor.

## Integration versus contract

| Layer       | Question                                               | Topology                                                                  | Owned behavior                                                          |
| ----------- | ------------------------------------------------------ | ------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Contract    | Does the provider satisfy the consumer's expectations? | Real consumer code → Pact mock; Pact verifier → real provider HTTP server | Request/response shape, required headers, statuses, consumer parsing    |
| Integration | Do the services work together at runtime?              | Real API → real provider → real PostgreSQL                                | Timeout, retry, replay, concurrency, persistence, rollback, correlation |

Both layers are required. Pact does not cover latency, database state, idempotency replay sequences, provider health, or the test inspection endpoint.

## Consumer contracts

The V4 Pact contains three interactions for `POST /payments/authorize`:

1. `payment can be approved` returns HTTP 200 with an approved payment.
2. `payment will be declined` returns HTTP 200 with a declined payment.
3. `provider returns an internal error` returns HTTP 500, which the production client maps to `PaymentProviderUnavailableError`.

Every request proves the exact amount, USD currency, opaque customer reference, `Idempotency-Key`, and `X-Request-ID` expected by the consumer. The internal `X-Test-Payment-Scenario` header is deliberately absent from the consumer Pact because it is a provider test control, not part of the public consumer contract.

The 500 interaction configures the real client with `maxAttempts: 1` so one Pact interaction corresponds to one HTTP exchange. Production still uses its normal retry policy. Contract tests use a generous two-second deadline and do not test temporal failure behavior.

## Matchers and strictness

Pact matchers require `paymentId` to be UUID-shaped and `amountCents` to be an integer while preserving exact business values for `status` and `currency`. The consumer contract includes only response fields it reads: `paymentId`, `status`, `amountCents`, and `currency`.

This is intentionally strict about dependencies and tolerant of unrelated additions. An exact generated UUID would be brittle; accepting any status or currency would miss a breaking change.

## Provider verification and states

The provider verifier loads the freshly generated Pact and calls a real Fastify server through HTTP. It starts the service on an operating-system-assigned port, never hardcodes a port, and closes it after the suite. `PAYMENT_PROVIDER_CONTRACT_URL` can instead point verification at an already-running provider, including the Docker service.

Named provider-state handlers select `approved`, `declined`, or `server-error` behavior by injecting the fake provider's internal scenario header only during verification. The provider is deterministic and needs no database or state endpoint for these interactions. The provider test itself fails early with the expected Pact path if consumer generation did not run.

## Contract artifacts

Consumer generation deletes only this repository's `pacts/` directory before creating `pacts/ReleaseGuard API-ReleaseGuard Payment Provider.json`. Generated artifacts and logs are ignored by Git because consumer and provider live in the same monorepo. CI regenerates and verifies the contract in one ordered command, then uploads `pacts/` as the seven-day `pact-contracts` artifact for diagnosis.

The artifact contains deterministic synthetic UUIDs and opaque references only—no secret, personal data, or local filesystem path.

## CI gate

`npm run test:contract` always runs consumer generation before provider verification. GitHub Actions executes that command in a dedicated required-to-pass job. A missing Pact, unmatched consumer request, incompatible provider response, or provider verification error fails the job; artifact upload runs even after failure.

Useful local commands:

```powershell
npm run test:contract:consumer
npm run test:contract:provider
npm run test:contract
```

## Breaking-change detection

The consumer expects a response shaped like:

```json
{
  "paymentId": "3d5f2047-dfe8-4e15-9a67-91aebc76bd7d",
  "status": "approved",
  "amountCents": 2900,
  "currency": "USD"
}
```

If the provider renames `paymentId` to `transactionId`, removes `amountCents`, changes `currency` to an unsupported value, or changes the approved status code, provider verification fails. No test edits production source at runtime; the real verifier is the executable proof.

## Non-breaking evolution

Adding an unconsumed response field such as `processedAt` is compatible because Pact response-body matching permits additional provider fields by default. Adding a new optional provider capability is likewise safe while existing interactions remain valid. A consumer that starts relying on a field must first publish that expectation through a new contract.

## Why no Pact Broker

A broker would add infrastructure without improving the current monorepo workflow: both sides are built from one commit and can exchange a freshly generated file in the same job. Pact files are therefore CI outputs rather than source-controlled files.

If consumer and provider move to separate repositories, the next design would publish contracts with application version and branch metadata, verify them independently, publish verification results, use deployment-environment records, and gate releases with `can-i-deploy`. PactFlow is a possible hosted implementation, but this phase has no broker, SaaS dependency, webhook, or global Pact installation.

## Anti-patterns avoided

- No frontend-to-provider contract: the API owns this boundary.
- No parallel consumer generation and provider verification: the verifier depends on the new artifact.
- No separate test-only HTTP client that could drift from production serialization.
- No exact dynamic payment ID, random provider state, fixed port, arbitrary sleep, or stale Pact reuse.
- No attempt to model timeout, retry, replay, concurrency, health, database behavior, or the full validation matrix as Pact interactions.
- No public application endpoint or production behavior added for Pact.
