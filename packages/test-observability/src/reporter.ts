import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestError,
  TestResult,
} from '@playwright/test/reporter';
import { analyzeTests } from './analyzer.js';
import { classifyFailure } from './failure-classifier.js';
import { browserForProject, stableTestId } from './identity.js';
import {
  repositoryRelativePath,
  sanitizeErrorMessage,
  sanitizeLabel,
  sanitizeRequestId,
} from './sanitize.js';
import type {
  ObservabilityResult,
  RunError,
  TestAttempt,
  TestObservation,
  TestStatus,
} from './types.js';

interface ReporterOptions {
  outputFile?: string;
}

const DEFAULT_OUTPUT = 'test-observability-results/playwright.json';

function testStatus(
  test: TestCase,
  result: TestResult | undefined,
): TestStatus {
  const outcome = test.outcome();
  if (outcome === 'skipped' || test.expectedStatus === 'skipped')
    return 'skipped';
  if (outcome === 'expected' || outcome === 'flaky') return 'passed';
  if (result?.status === 'interrupted') return 'interrupted';
  return 'failed';
}

function describePath(test: TestCase): string[] {
  const suites: string[] = [];
  let current: Suite | undefined = test.parent;
  while (current) {
    if (current.type === 'describe')
      suites.unshift(sanitizeLabel(current.title));
    current = current.parent;
  }
  return suites;
}

function requestIds(result: TestResult): string[] {
  return [
    ...new Set(
      result.annotations
        .filter((annotation) => annotation.type.toLowerCase() === 'request-id')
        .map((annotation) => sanitizeRequestId(annotation.description ?? ''))
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort();
}

function errorDetails(error: TestError | undefined, repositoryRoot: string) {
  if (!error) return undefined;
  const raw = error.message ?? error.value ?? error.stack;
  return {
    category: classifyFailure(raw),
    message: sanitizeErrorMessage(raw, repositoryRoot),
  };
}

function mapAttempt(result: TestResult, repositoryRoot: string): TestAttempt {
  const error = errorDetails(result.error ?? result.errors[0], repositoryRoot);
  return {
    attempt: result.retry + 1,
    retry: result.retry,
    status: result.status,
    startedAt: result.startTime.toISOString(),
    durationMs: result.duration,
    ...(error ? { error } : {}),
    attachments: result.attachments.map((attachment) => {
      const relative = repositoryRelativePath(attachment.path, repositoryRoot);
      return {
        name: sanitizeLabel(attachment.name),
        contentType: sanitizeLabel(attachment.contentType, 100),
        ...(relative ? { path: relative } : {}),
      };
    }),
    requestIds: requestIds(result),
  };
}

function mapTest(
  test: TestCase,
  repositoryRoot: string,
  fallbackStart: Date,
): TestObservation {
  const project = test.parent.project()?.name ?? 'unknown';
  const file =
    repositoryRelativePath(test.location.file, repositoryRoot) ??
    path.basename(test.location.file);
  const suite = describePath(test);
  const title = sanitizeLabel(test.title, 300);
  const fullTitle = [...suite, title].join(' › ');
  const actualResults = [...test.results].sort(
    (left, right) => left.retry - right.retry,
  );
  const attempts = actualResults.map((result) =>
    mapAttempt(result, repositoryRoot),
  );
  if (attempts.length === 0) {
    attempts.push({
      attempt: 1,
      retry: 0,
      status: 'skipped',
      startedAt: fallbackStart.toISOString(),
      durationMs: 0,
      attachments: [],
      requestIds: [],
    });
  }
  const finalResult = actualResults.at(-1);
  const status = testStatus(test, finalResult);
  const flaky =
    test.outcome() === 'flaky' &&
    finalResult?.status === 'passed' &&
    actualResults
      .slice(0, -1)
      .some(
        (result) => result.status === 'failed' || result.status === 'timedOut',
      );

  return {
    id: stableTestId({
      file,
      project,
      fullTitle,
      repeatEachIndex: test.repeatEachIndex,
    }),
    project,
    browser: browserForProject(project),
    file,
    line: test.location.line,
    column: test.location.column,
    suite,
    title,
    fullTitle,
    tags: [...new Set(test.tags.map((tag) => sanitizeLabel(tag, 80)))].sort(),
    expectedStatus: test.expectedStatus,
    status,
    flaky,
    retryCount: Math.max(...attempts.map((attempt) => attempt.retry)),
    durationMs: attempts.reduce(
      (total, attempt) => total + attempt.durationMs,
      0,
    ),
    attempts,
  };
}

export default class TestObservabilityReporter implements Reporter {
  private readonly outputFile: string;
  private readonly repositoryRoot = process.cwd();
  private suite?: Suite;
  private runErrors: RunError[] = [];

  constructor(options: ReporterOptions = {}) {
    this.outputFile =
      options.outputFile ??
      process.env.TEST_OBSERVABILITY_OUTPUT ??
      DEFAULT_OUTPUT;
  }

  printsToStdio(): boolean {
    return false;
  }

  onBegin(_config: FullConfig, suite: Suite): void {
    this.suite = suite;
  }

  onError(error: TestError): void {
    this.runErrors.push({
      category: classifyFailure(error.message ?? error.value ?? error.stack),
      message: sanitizeErrorMessage(
        error.message ?? error.value ?? error.stack,
        this.repositoryRoot,
      ),
    });
  }

  async onEnd(
    fullResult: FullResult,
  ): Promise<{ status?: FullResult['status'] }> {
    try {
      if (!this.suite)
        throw new Error('The Playwright suite was not initialized.');
      const resolvedOutput = path.resolve(this.repositoryRoot, this.outputFile);
      if (!repositoryRelativePath(resolvedOutput, this.repositoryRoot)) {
        throw new Error(
          'TEST_OBSERVABILITY_OUTPUT must resolve inside the repository.',
        );
      }

      const tests = this.suite
        .allTests()
        .map((test) => mapTest(test, this.repositoryRoot, fullResult.startTime))
        .sort((left, right) => left.id.localeCompare(right.id));
      const endedAt = new Date(
        fullResult.startTime.getTime() + fullResult.duration,
      );
      const result: ObservabilityResult = {
        schemaVersion: 1,
        run: {
          id:
            process.env.TEST_RUN_ID ??
            `local-${fullResult.startTime.toISOString().replaceAll(/[:.]/g, '-')}`,
          startedAt: fullResult.startTime.toISOString(),
          endedAt: endedAt.toISOString(),
          durationMs: fullResult.duration,
          status: fullResult.status,
          ci: Boolean(process.env.CI),
          git: {
            ...(process.env.GITHUB_SHA ? { sha: process.env.GITHUB_SHA } : {}),
            ...(process.env.GITHUB_REF ? { ref: process.env.GITHUB_REF } : {}),
          },
          github: {
            ...(process.env.GITHUB_RUN_ID
              ? { runId: process.env.GITHUB_RUN_ID }
              : {}),
            ...(process.env.GITHUB_RUN_ATTEMPT
              ? { runAttempt: process.env.GITHUB_RUN_ATTEMPT }
              : {}),
            ...(process.env.GITHUB_JOB ? { job: process.env.GITHUB_JOB } : {}),
          },
        },
        summary: analyzeTests(tests),
        tests,
        runErrors: this.runErrors,
      };

      await mkdir(path.dirname(resolvedOutput), { recursive: true });
      const temporary = `${resolvedOutput}.${process.pid}.${Date.now()}.tmp`;
      await writeFile(
        temporary,
        `${JSON.stringify(result, null, 2)}\n`,
        'utf8',
      );
      await rename(temporary, resolvedOutput);
      return {};
    } catch (error) {
      console.error(
        `[test-observability] ${sanitizeErrorMessage(String(error), this.repositoryRoot)}`,
      );
      return { status: 'failed' };
    }
  }
}
