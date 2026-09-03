import { describe, expect, it } from 'vitest';
import {
  analyzeTests,
  browserForProject,
  classifyFailure,
  isObservabilityResult,
  renderMarkdown,
  sanitizeErrorMessage,
  stableTestId,
} from '@releaseguard/test-observability';
import type {
  AttemptStatus,
  ObservabilityResult,
  TestObservation,
} from '@releaseguard/test-observability';

function observation(
  overrides: Partial<TestObservation> &
    Pick<TestObservation, 'id' | 'project' | 'status'>,
): TestObservation {
  const { id, project, status, ...optionalOverrides } = overrides;
  const attemptStatus: AttemptStatus = status === 'failed' ? 'failed' : status;
  return {
    id,
    project,
    browser: null,
    file: 'tests/example.spec.ts',
    line: 10,
    column: 1,
    suite: ['subscriptions'],
    title: `test ${overrides.id}`,
    fullTitle: `subscriptions › test ${overrides.id}`,
    tags: [],
    expectedStatus: 'passed',
    status,
    flaky: false,
    retryCount: 0,
    durationMs: 100,
    attempts: [
      {
        attempt: 1,
        retry: 0,
        status: attemptStatus,
        startedAt: '2026-01-01T00:00:00.000Z',
        durationMs: 100,
        attachments: [],
        requestIds: [],
      },
    ],
    ...optionalOverrides,
  };
}

describe('failure classifier', () => {
  it.each([
    ['Expected 201, received 409', 'assertion'],
    ['Test timeout of 30000ms exceeded', 'timeout'],
    ['request failed with ECONNREFUSED', 'network'],
    ['HTTP 503 service unavailable', 'application'],
    ["browser executable doesn't exist", 'environment'],
    ['something novel happened', 'unknown'],
  ])('classifies %s as %s', (message, category) => {
    expect(classifyFailure(message)).toBe(category);
  });
});

describe('stable test identity', () => {
  it('is repeatable and independent of absolute workspace separators', () => {
    const windows = stableTestId({
      file: 'tests\\ui\\subscriptions.spec.ts',
      project: 'ui-chromium',
      fullTitle: 'subscriptions › creates a plan @critical',
    });
    const unix = stableTestId({
      file: 'tests/ui/subscriptions.spec.ts',
      project: 'ui-chromium',
      fullTitle: 'subscriptions › creates a plan @critical',
    });

    expect(windows).toBe(unix);
    expect(windows).toMatch(/^[a-f0-9]{16}$/);
  });

  it('changes when the logical project changes', () => {
    const base = {
      file: 'tests/ui/example.spec.ts',
      fullTitle: 'suite › test',
    };
    expect(stableTestId({ ...base, project: 'ui-chromium' })).not.toBe(
      stableTestId({ ...base, project: 'ui-webkit-smoke' }),
    );
  });
});

describe('observability analyzer', () => {
  it('computes status, project, tag, retry, flaky, p95 and failure summaries', () => {
    const tests = [
      observation({
        id: 'pass',
        project: 'api',
        status: 'passed',
        durationMs: 10,
        tags: ['@smoke'],
      }),
      observation({
        id: 'flaky',
        project: 'ui-chromium',
        status: 'passed',
        flaky: true,
        retryCount: 1,
        durationMs: 80,
        tags: ['@smoke', '@critical'],
        attempts: [
          {
            attempt: 1,
            retry: 0,
            status: 'failed',
            startedAt: '2026-01-01T00:00:00.000Z',
            durationMs: 50,
            error: { category: 'assertion', message: 'Expected true' },
            attachments: [],
            requestIds: [],
          },
          {
            attempt: 2,
            retry: 1,
            status: 'passed',
            startedAt: '2026-01-01T00:00:00.050Z',
            durationMs: 30,
            attachments: [],
            requestIds: ['request-1'],
          },
        ],
      }),
      observation({
        id: 'failure',
        project: 'api',
        status: 'failed',
        durationMs: 200,
        attempts: [
          {
            attempt: 1,
            retry: 0,
            status: 'failed',
            startedAt: '2026-01-01T00:00:00.000Z',
            durationMs: 200,
            error: { category: 'application', message: 'HTTP 503' },
            attachments: [],
            requestIds: [],
          },
        ],
      }),
      observation({
        id: 'skip',
        project: 'api',
        status: 'skipped',
        durationMs: 0,
      }),
    ];

    const summary = analyzeTests(tests);

    expect(summary).toMatchObject({
      total: 4,
      passed: 2,
      failed: 1,
      skipped: 1,
      flaky: 1,
      retried: 1,
      passRate: 66.67,
      p95DurationMs: 200,
    });
    expect(summary.byProject.api).toMatchObject({
      total: 3,
      failed: 1,
      skipped: 1,
    });
    expect(summary.byTag['@smoke']).toMatchObject({ total: 2, flaky: 1 });
    expect(summary.failuresByCategory.application).toBe(1);
    expect(summary.slowestTests[0]?.id).toBe('failure');
  });

  it('rejects malformed schema input', () => {
    expect(isObservabilityResult({ schemaVersion: 2, tests: [] })).toBe(false);
    expect(
      isObservabilityResult({
        schemaVersion: 1,
        run: { id: 'bad', durationMs: 1, status: 'passed' },
        tests: [{ id: 'missing-required-fields' }],
      }),
    ).toBe(false);
  });
});

describe('Markdown summary and redaction', () => {
  it('renders a compact escaped report', () => {
    const tests = [
      observation({
        id: 'one',
        project: 'ui-chromium',
        status: 'passed',
        fullTitle: 'checkout | confirms subscription',
        tags: ['@critical'],
      }),
    ];
    const result: ObservabilityResult = {
      schemaVersion: 1,
      run: {
        id: 'synthetic-run',
        startedAt: '2026-01-01T00:00:00.000Z',
        endedAt: '2026-01-01T00:00:00.100Z',
        durationMs: 100,
        status: 'passed',
        ci: false,
      },
      summary: analyzeTests(tests),
      tests,
      runErrors: [],
    };

    const markdown = renderMarkdown(result);
    expect(markdown).toContain('Playwright test observability');
    expect(markdown).toContain('checkout \\| confirms subscription');
    expect(markdown).toContain('| @critical |');
    expect(markdown.length).toBeLessThan(5_000);
  });

  it('redacts credentials and truncates noisy errors', () => {
    const message = sanitizeErrorMessage(
      `C:\\Users\\private-user\\work Bearer abc.def password=super-secret ${'x'.repeat(1_000)}`,
    );
    expect(message).not.toContain('private-user');
    expect(message).not.toContain('abc.def');
    expect(message).not.toContain('super-secret');
    expect(message.length).toBeLessThanOrEqual(500);
  });
});

describe('browser mapping', () => {
  it('only identifies browser-oriented projects', () => {
    expect(browserForProject('ui-firefox-smoke')).toBe('firefox');
    expect(browserForProject('visual')).toBe('chromium');
    expect(browserForProject('api')).toBeNull();
  });
});
