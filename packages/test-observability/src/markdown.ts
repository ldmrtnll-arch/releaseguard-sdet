import type { DimensionSummary, ObservabilityResult } from './types.js';

function escapeCell(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll(/[\r\n]+/g, ' ');
}

function duration(milliseconds: number): string {
  return milliseconds < 1000
    ? `${Math.round(milliseconds)} ms`
    : `${(milliseconds / 1000).toFixed(2)} s`;
}

function dimensionTable(
  title: string,
  label: string,
  groups: Record<string, DimensionSummary>,
): string[] {
  const entries = Object.entries(groups);
  if (entries.length === 0) return [];
  return [
    `## ${title}`,
    '',
    `| ${label} | Total | Passed | Failed | Skipped | Flaky | Duration |`,
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...entries.map(
      ([name, item]) =>
        `| ${escapeCell(name)} | ${item.total} | ${item.passed} | ${item.failed + item.interrupted} | ${item.skipped} | ${item.flaky} | ${duration(item.durationMs)} |`,
    ),
    '',
  ];
}

export function renderMarkdown(result: ObservabilityResult): string {
  const { run, summary } = result;
  const failureRows = Object.entries(summary.failuresByCategory).filter(
    ([, count]) => count > 0,
  );
  const lines = [
    '# Playwright test observability',
    '',
    `Run \`${escapeCell(run.id)}\` · **${run.status.toUpperCase()}** · ${duration(run.durationMs)}`,
    '',
    '| Total | Passed | Failed | Skipped | Flaky | Retried | Pass rate | p95 |',
    '| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    `| ${summary.total} | ${summary.passed} | ${summary.failed + summary.interrupted} | ${summary.skipped} | ${summary.flaky} | ${summary.retried} | ${summary.passRate.toFixed(2)}% | ${duration(summary.p95DurationMs)} |`,
    '',
    ...dimensionTable('Projects', 'Project', summary.byProject),
    ...dimensionTable('Tags', 'Tag', summary.byTag),
  ];

  if (failureRows.length > 0) {
    lines.push(
      '## Failure categories',
      '',
      '| Category | Count |',
      '| --- | ---: |',
    );
    lines.push(
      ...failureRows.map(([category, count]) => `| ${category} | ${count} |`),
      '',
    );
  }

  if (summary.slowestTests.length > 0) {
    lines.push(
      '## Slowest tests',
      '',
      '| Test | Project | Duration |',
      '| --- | --- | ---: |',
    );
    lines.push(
      ...summary.slowestTests.map(
        (test) =>
          `| ${escapeCell(test.fullTitle)} | ${escapeCell(test.project)} | ${duration(test.durationMs)} |`,
      ),
      '',
    );
  }

  return `${lines.join('\n').trim()}\n`;
}
