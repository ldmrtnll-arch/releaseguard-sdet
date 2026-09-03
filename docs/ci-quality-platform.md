# CI Quality Platform

ReleaseGuard uses GitHub Actions as a proportional quality platform: fast feedback on every pull request, parallel and reproducible gates, isolated test state, useful failure evidence, and cost-aware placement of expensive suites.

## Workflows and triggers

| Workflow              | Pull request | Push to `main` | Manual | Schedule             |
| --------------------- | ------------ | -------------- | ------ | -------------------- |
| `CI`                  | Yes          | Yes            | No     | No                   |
| `Extended regression` | No           | No             | Yes    | Sundays at 04:00 UTC |
| `Performance Load`    | No           | No             | Yes    | No                   |

New commits cancel an older run for the same pull request. Runs on `main`, extended regressions, and controlled loads are never cancelled automatically. The two expensive workflows use separate global groups so another regression or load queues instead of competing with an active run. Independent jobs within a run execute in parallel and every database-dependent job receives its own PostgreSQL service.

## Pull-request gates

| Required check        | Scope                                                         | Why it is on every pull request                            |
| --------------------- | ------------------------------------------------------------- | ---------------------------------------------------------- |
| `Quality`             | clean install, formatting, lint, typecheck, build, unit tests | Fast static and component feedback                         |
| `API and integration` | provider, ReleaseGuard API, and PostgreSQL integration suites | Protects service boundaries and persistence                |
| `Contract`            | Pact consumer generation and real provider verification       | Detects payment boundary incompatibility                   |
| `Chromium UI`         | Full functional and resilience UI suite                       | Protects the primary browser journey                       |
| `Firefox UI smoke`    | Four high-value journeys                                      | Low-cost secondary-browser signal                          |
| `WebKit UI smoke`     | Four high-value journeys                                      | Low-cost secondary-browser signal                          |
| `Advanced quality`    | Six accessibility scans and four visual comparisons           | Protects accessibility and selected layout regions         |
| `Performance smoke`   | Warmed, bounded k6 regression workload                        | Detects coarse latency, correctness, and error regressions |

These exact check names are recommended for branch protection. Branch protection remains a repository setting and is not changed by the workflows.

The jobs do not form a serial chain. Although `Quality` is fast, making every other gate depend on it would delay complete feedback and hide independent failures. GitHub-hosted runners provide isolated execution, while each database job uses explicit migrations and health-based PostgreSQL readiness. Playwright's `webServer` readiness URLs start the API, web application, and controlled payment provider without arbitrary sleeps.

## Extended regression

`Extended regression` runs the existing 21-test UI project in full on Chromium, Firefox, and WebKit. Each browser is a separate Linux matrix job with `fail-fast: false`, a selective browser install, an ephemeral PostgreSQL service, and unique evidence. This broader 63-execution matrix stays outside pull requests because secondary-browser full coverage costs substantially more than the four-test PR smoke.

The workflow can be started with `workflow_dispatch` and runs weekly on Sunday at 04:00 UTC. A current run is allowed to finish; a new manual or scheduled request queues behind it rather than cancelling it. Playwright's existing retry policy remains authoritative, and any recovered retry is visible as flaky in the job summary. There is no automatic quarantine.

## Performance placement

The warmed PR smoke remains a coarse regression gate on a shared runner. Controlled load remains manual in `Performance Load`, with non-cancelling concurrency and 14-day evidence retention. Full load is intentionally not scheduled or run on pull requests. Thresholds, workload details, sanitizer behavior, and local execution are documented in [Performance Testing](performance-testing.md).

## Runtime and dependency policy

Application commands run on Node.js 22, centralized once per workflow. Repetitive dependency jobs use `actions/setup-node`'s npm download cache against the root `package-lock.json`; `node_modules` and Playwright browser directories are not cached. Every install remains `npm ci`.

Browser jobs install only their required engine. The advanced-quality job uses the repository's pinned `mcr.microsoft.com/playwright:v1.62.1-noble` image, which matches the package and visual baselines. API and contract jobs install no browser.

Official GitHub actions use stable major tags: `actions/checkout@v7`, `actions/setup-node@v7`, and `actions/upload-artifact@v7`. Those releases use a maintained Node.js action runtime and address the obsolete-runtime warning seen with the previous majors; the next hosted run will provide final environmental confirmation. Full SHA pinning is not part of this portfolio's current policy; floating branches such as `master` are never used.

`npm audit` remains an explicit local/release-candidate validation instead of a required PR step. The lockfile is still audited during `npm ci`, but a second advisory-network request would add an external availability failure mode to the static gate.

## Artifacts

| Artifact                                                     | When                         | Retention | Purpose                                                               |
| ------------------------------------------------------------ | ---------------------------- | --------- | --------------------------------------------------------------------- |
| `observability-api-integration`                              | Always                       | 7 days    | Provider, API, and integration JSON/Markdown summaries                |
| `playwright-api-integration`                                 | Failure                      | 7 days    | HTML report, traces, screenshots, videos, and test output             |
| `pact-contracts`                                             | Always when generated        | 7 days    | Consumer contract used by provider verification                       |
| `observability-ui-chromium`                                  | Always                       | 7 days    | Full Chromium result and flaky evidence                               |
| `playwright-ui-chromium`                                     | Failure                      | 7 days    | Chromium diagnostics                                                  |
| `observability-firefox-smoke` / `observability-webkit-smoke` | Always                       | 7 days    | Per-browser PR smoke summaries                                        |
| `playwright-firefox-smoke` / `playwright-webkit-smoke`       | Failure                      | 7 days    | Per-browser PR smoke diagnostics                                      |
| `observability-advanced-quality`                             | Always                       | 7 days    | Accessibility and visual summaries                                    |
| `playwright-advanced-quality`                                | Failure                      | 7 days    | Accessibility violations and visual diffs plus Playwright diagnostics |
| `performance-smoke-results`                                  | Always after safe generation | 7 days    | Sanitized k6 smoke summary                                            |
| `observability-<browser>-full`                               | Always                       | 7 days    | Extended browser result and flaky evidence                            |
| `playwright-<browser>-full`                                  | Failure                      | 7 days    | Extended browser diagnostics                                          |
| `performance-load-results`                                   | Always after safe generation | 14 days   | Sanitized controlled-load summary                                     |

Observability outputs use repository-relative paths and sanitized errors. Performance publication is fail-closed: raw output is removed, and sanitizer failure prevents a potentially sensitive artifact from being published. Pact details are in [Contract Testing](contract-testing.md); result schema and classification are in [Test Observability](test-observability.md).

## Failure investigation

1. Read the failing step and the job's GitHub Step Summary for logical results, retry/flaky state, slow tests, and probable failure category.
2. Download the corresponding observability artifact to inspect its JSON and Markdown. `Result unavailable` means the runner failed before Playwright could produce a result; it never turns the job green.
3. For Playwright failures, open the failure-only HTML report and then inspect trace, screenshot, video, or visual diff in `test-results`.
4. For contracts or performance, inspect the Pact JSON or sanitized k6 summary.
5. Review health/readiness and service logs in the job when evidence points to API, provider, database, or startup failure.

The original test command controls the job result. Analyzer steps use `if: always()` to preserve evidence and never use `continue-on-error` to conceal a quality-gate failure.

## Deliberately avoided CI anti-patterns

- full k6 load or a full three-browser matrix on every pull request;
- sleep-based readiness or shared databases across jobs;
- one giant serial pipeline;
- `continue-on-error` on required gates;
- stale PR runs consuming runner capacity;
- indiscriminate successful-run diagnostics or artifacts containing secrets;
- automatic visual baseline updates;
- more retries to mask instability;
- cross-job aggregation, path-based skipping, or invented coverage percentages.
