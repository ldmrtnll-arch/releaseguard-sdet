# Changelog

All notable changes to ReleaseGuard are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project prepares versions using [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - Unreleased

### Added

- Controlled React, Fastify, PostgreSQL, and fake-payment-provider system under test.
- Parallel-safe test-data builders and API-first authenticated/subscribed fixtures.
- Unit, provider, API, database integration, Pact contract, functional UI, accessibility, visual, resilience, and performance coverage.
- Concurrency and payment-idempotency evidence protecting one active subscription and one logical charge.
- Repository-owned Playwright observability with stable IDs, retry/flaky visibility, safe JSON, Markdown summaries, and slow-test analysis.
- Parallel pull-request quality gates, extended three-browser regression, and manual controlled-load workflows.
- Portfolio README, interview demo, release notes, and release checklist.

### Security

- Password and Authorization-header log redaction.
- Production-mode protection for API test controls.
- Fail-closed sanitization of performance artifacts and credential-safe Playwright observability output.

### Notes

- The release candidate is prepared for review; no `v1.0.0` tag or GitHub Release exists yet.
