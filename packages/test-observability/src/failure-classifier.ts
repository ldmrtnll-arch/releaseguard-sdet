import type { FailureCategory } from './types.js';

const rules: Array<[FailureCategory, RegExp]> = [
  ['timeout', /\b(timeout|timed out|exceeded.*time|test timeout)\b/i],
  [
    'network',
    /\b(ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN|socket hang up|network error|fetch failed|DNS)\b/i,
  ],
  [
    'environment',
    /\b(ENOENT|EACCES|permission denied|executable doesn'?t exist|browser.*not (?:found|installed)|docker daemon|migration failed|database unavailable)\b/i,
  ],
  [
    'application',
    /\b(HTTP\s*5\d\d|status(?: code)?\s*5\d\d|internal server error|service unavailable|bad gateway)\b/i,
  ],
  [
    'assertion',
    /\b(AssertionError|expect(?:ed)?|received|toBe|toEqual|toHave|locator assertion)\b/i,
  ],
];

export function classifyFailure(message: string | undefined): FailureCategory {
  if (!message) return 'unknown';
  return rules.find(([, pattern]) => pattern.test(message))?.[0] ?? 'unknown';
}
