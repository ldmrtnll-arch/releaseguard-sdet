export const failureCategories = [
  'assertion',
  'timeout',
  'network',
  'application',
  'environment',
  'unknown',
] as const;

export type FailureCategory = (typeof failureCategories)[number];
export type AttemptStatus =
  'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';
export type TestStatus = 'passed' | 'failed' | 'skipped' | 'interrupted';

export interface ObservabilityError {
  category: FailureCategory;
  message: string;
}

export interface AttachmentMetadata {
  name: string;
  contentType: string;
  path?: string;
}

export interface TestAttempt {
  attempt: number;
  retry: number;
  status: AttemptStatus;
  startedAt: string;
  durationMs: number;
  error?: ObservabilityError;
  attachments: AttachmentMetadata[];
  requestIds: string[];
}

export interface TestObservation {
  id: string;
  project: string;
  browser: string | null;
  file: string;
  line: number;
  column: number;
  suite: string[];
  title: string;
  fullTitle: string;
  tags: string[];
  expectedStatus: AttemptStatus;
  status: TestStatus;
  flaky: boolean;
  retryCount: number;
  durationMs: number;
  attempts: TestAttempt[];
}

export interface CountSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  interrupted: number;
  flaky: number;
  retried: number;
}

export interface DimensionSummary extends CountSummary {
  durationMs: number;
}

export interface SlowTest {
  id: string;
  project: string;
  fullTitle: string;
  durationMs: number;
}

export interface ObservabilitySummary extends CountSummary {
  passRate: number;
  p95DurationMs: number;
  durationMs: number;
  byProject: Record<string, DimensionSummary>;
  byTag: Record<string, DimensionSummary>;
  failuresByCategory: Record<FailureCategory, number>;
  slowestTests: SlowTest[];
}

export type RunError = ObservabilityError;

export interface ObservabilityRun {
  id: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  status: 'passed' | 'failed' | 'timedout' | 'interrupted';
  ci: boolean;
  git?: {
    sha?: string;
    ref?: string;
  };
  github?: {
    runId?: string;
    runAttempt?: string;
    job?: string;
  };
}

export interface ObservabilityResult {
  schemaVersion: 1;
  run: ObservabilityRun;
  summary: ObservabilitySummary;
  tests: TestObservation[];
  runErrors: RunError[];
}
