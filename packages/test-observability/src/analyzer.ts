import { failureCategories } from './types.js';
import type {
  CountSummary,
  DimensionSummary,
  FailureCategory,
  ObservabilityResult,
  ObservabilitySummary,
  TestObservation,
} from './types.js';

function emptyCounts(): CountSummary {
  return {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    interrupted: 0,
    flaky: 0,
    retried: 0,
  };
}

function increment(summary: CountSummary, test: TestObservation): void {
  summary.total += 1;
  summary[test.status] += 1;
  if (test.flaky) summary.flaky += 1;
  if (test.retryCount > 0) summary.retried += 1;
}

function groupBy(
  tests: TestObservation[],
  selector: (test: TestObservation) => string[],
): Record<string, DimensionSummary> {
  const groups: Record<string, DimensionSummary> = {};
  for (const test of tests) {
    for (const key of selector(test)) {
      const group = (groups[key] ??= { ...emptyCounts(), durationMs: 0 });
      increment(group, test);
      group.durationMs += test.durationMs;
    }
  }
  return Object.fromEntries(
    Object.entries(groups).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function percentile95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.ceil(sorted.length * 0.95) - 1] ?? 0;
}

export function analyzeTests(tests: TestObservation[]): ObservabilitySummary {
  const counts = emptyCounts();
  const failuresByCategory = Object.fromEntries(
    failureCategories.map((category) => [category, 0]),
  ) as Record<FailureCategory, number>;

  for (const test of tests) {
    increment(counts, test);
    if (test.status === 'failed' || test.status === 'interrupted') {
      const category =
        [...test.attempts].reverse().find((attempt) => attempt.error)?.error
          ?.category ?? 'unknown';
      failuresByCategory[category] += 1;
    }
  }

  const executed = counts.passed + counts.failed + counts.interrupted;
  return {
    ...counts,
    passRate:
      executed === 0
        ? 0
        : Number(((counts.passed / executed) * 100).toFixed(2)),
    p95DurationMs: percentile95(
      tests
        .filter((test) => test.status !== 'skipped')
        .map((test) => test.durationMs),
    ),
    durationMs: tests.reduce((total, test) => total + test.durationMs, 0),
    byProject: groupBy(tests, (test) => [test.project]),
    byTag: groupBy(tests, (test) => test.tags),
    failuresByCategory,
    slowestTests: [...tests]
      .filter((test) => test.status !== 'skipped')
      .sort(
        (left, right) =>
          right.durationMs - left.durationMs || left.id.localeCompare(right.id),
      )
      .slice(0, 10)
      .map(({ id, project, fullTitle, durationMs }) => ({
        id,
        project,
        fullTitle,
        durationMs,
      })),
  };
}

export function isObservabilityResult(
  value: unknown,
): value is ObservabilityResult {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ObservabilityResult>;
  if (
    candidate.schemaVersion !== 1 ||
    !candidate.run ||
    !Array.isArray(candidate.tests)
  )
    return false;
  if (
    typeof candidate.run.id !== 'string' ||
    typeof candidate.run.durationMs !== 'number' ||
    !['passed', 'failed', 'timedout', 'interrupted'].includes(
      candidate.run.status,
    )
  ) {
    return false;
  }
  return candidate.tests.every(
    (test) =>
      Boolean(test) &&
      typeof test.id === 'string' &&
      typeof test.project === 'string' &&
      typeof test.durationMs === 'number' &&
      ['passed', 'failed', 'skipped', 'interrupted'].includes(test.status) &&
      Array.isArray(test.tags) &&
      Array.isArray(test.attempts) &&
      test.attempts.every(
        (attempt) =>
          typeof attempt.retry === 'number' &&
          typeof attempt.durationMs === 'number' &&
          ['passed', 'failed', 'timedOut', 'skipped', 'interrupted'].includes(
            attempt.status,
          ),
      ),
  );
}
