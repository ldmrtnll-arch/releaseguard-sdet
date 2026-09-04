# Playwright Test Observability

ReleaseGuard includes a small, repository-owned observability layer for Playwright. It turns each execution into a stable JSON document and a compact Markdown summary without replacing Playwright's terminal or HTML reporters.

## Run it

Every Playwright command writes `test-observability-results/playwright.json` automatically. Analyze the latest result with:

```powershell
npm run test:analyze
```

This validates schema V1, recomputes the metrics, writes `test-observability-results/summary.md`, prints one concise line, and appends the same Markdown to `GITHUB_STEP_SUMMARY` when GitHub Actions provides it. `npm run test:summary` is a convenience alias.

Use a distinct file for an isolated run or CI job:

```powershell
$env:TEST_OBSERVABILITY_OUTPUT = 'test-observability-results/api.json'
npm run test:api
npm run test:analyze
```

The generated directory is ignored by Git. Reporter output is written to a temporary file and atomically renamed so a reader never consumes a partial JSON document. Output paths must resolve inside the repository.

## Schema V1

The top-level document contains:

- `schemaVersion`: currently `1`;
- `run`: run ID, timestamps, wall duration, final Playwright status, CI flag, and limited GitHub/Git metadata;
- `summary`: counts, pass rate, p95 duration, projects, tags, probable failure categories, and ten slowest tests;
- `tests`: one logical record per selected Playwright test;
- `runErrors`: sanitized errors reported outside an individual test.

Each test records a stable ID, repository-relative source, project, applicable browser, suite/title, Playwright tags, expected and final status, total attempt duration, retry count, flaky flag, and every attempt. An attempt contains its status, retry index, start/duration, sanitized failure, attachment metadata, and optional request IDs. Attachment bodies, stdout, stderr, traces, screenshots, videos, and full stacks are not copied into JSON; Playwright remains their source of truth.

The stable ID hashes the normalized relative file, logical project, full suite/title, and repeat index. It deliberately excludes machine paths, timestamps, worker assignment, duration, and retry outcome. Renaming or moving a test changes its identity; executing the same logical test on another machine does not.

## Metric semantics

- `passed`, `failed`, `skipped`, and `interrupted` describe logical final outcomes. An expected failure that fails is treated as passed; an unexpected pass is failed.
- `passRate = passed / (passed + failed + interrupted)`. Skipped tests do not inflate or reduce the rate.
- `flaky` means an earlier failed/timed-out attempt was followed by a passing retry. Synthetic unit data tests this path; the real suite contains no intentionally flaky test.
- `retryCount` and `retried` expose executed retries independently of flaky status.
- test duration is the sum of all attempts, making retry cost visible; run duration is Playwright wall-clock time and is not the sum of parallel test durations.
- p95 uses the nearest-rank value over non-skipped logical test durations.
- tags come from Playwright's `test.tags`, including `@` tags extracted from titles.
- failure classification is heuristic: `assertion`, `timeout`, `network`, `application`, `environment`, or `unknown`. It supports triage and is not a root-cause verdict.

## CI behavior

GitHub Actions assigns separate output names to provider, API, integration, Chromium, accessibility, visual, Firefox, and WebKit executions. The analyzer runs with `if: always()` and observability JSON/Markdown is uploaded with a job-specific artifact name for seven days. There is no cross-job aggregation in V1, so project counts remain honest for each invocation and visual output cannot overwrite accessibility output.

If Playwright fails, its step still fails. The following analyzer step publishes the available evidence but never converts that failure into success. If a runner crashes before JSON exists, CI uses `TEST_OBSERVABILITY_ALLOW_MISSING=true` to publish a clear “result unavailable” diagnostic instead of masking the original failure.

Vitest unit/contract results, Pact verification details, k6 metrics, Playwright HTML, and raw trace/screenshot/video evidence remain separate artifacts. This package observes Playwright only.

## Security and correlation

Error summaries are whitespace-normalized, truncated to 500 characters, stripped of ANSI output, made repository-relative where possible, and redact bearer values, JWT-shaped values, passwords, tokens, secrets, cookies, API keys, and URL credentials. JSON never records the local username/hostname, environment dumps, attachment bodies, stdout/stderr, or a full stack.

Request correlation is optional. A test or fixture may expose a safe ID without changing an API contract:

```ts
testInfo.annotations.push({ type: 'request-id', description: requestId });
```

Only annotations named `request-id` are captured. Current coverage does not guarantee this annotation for every request, so the field is often empty; broad product-protocol changes are intentionally outside this tool's scope.

## Limitations and flaky policy

V1 stores local/CI artifacts only: no database, dashboard, history service, trend engine, quarantine automation, Slack notification, or quality gate is introduced. Artifact retention and branch protection remain GitHub concerns. Probable categories need human validation, and timing from shared runners is diagnostic rather than a performance benchmark.

A flaky record is evidence of nondeterminism, not a pass to ignore. Keep retries bounded, investigate the original failed attempt and trace, fix or revert the cause, and do not add sleeps or intentionally unstable tests to manufacture analytics. Quarantine and automatic blocking are deferred.
