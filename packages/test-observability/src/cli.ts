import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { analyzeTests, isObservabilityResult } from './analyzer.js';
import { renderMarkdown } from './markdown.js';
import { repositoryRelativePath, sanitizeErrorMessage } from './sanitize.js';

const DEFAULT_INPUT = 'test-observability-results/playwright.json';

function summaryPath(input: string): string {
  const parsed = path.parse(input);
  const name = parsed.name === 'playwright' ? 'summary' : parsed.name;
  return path.join(parsed.dir, `${name}.md`);
}

async function publish(markdown: string, output: string): Promise<void> {
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, markdown, 'utf8');
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `\n${markdown}`, 'utf8');
  }
}

async function main(): Promise<void> {
  const repositoryRoot = process.cwd();
  const inputSetting =
    process.argv[2] ?? process.env.TEST_OBSERVABILITY_OUTPUT ?? DEFAULT_INPUT;
  const input = path.resolve(repositoryRoot, inputSetting);
  if (!repositoryRelativePath(input, repositoryRoot)) {
    throw new Error(
      'The observability input must resolve inside the repository.',
    );
  }
  const output = summaryPath(input);

  try {
    const parsed: unknown = JSON.parse(await readFile(input, 'utf8'));
    if (!isObservabilityResult(parsed))
      throw new Error('Unsupported or invalid observability schema.');
    parsed.summary = analyzeTests(parsed.tests);
    const markdown = renderMarkdown(parsed);
    await publish(markdown, output);
    console.log(
      `[test-observability] ${parsed.summary.total} tests, ${parsed.summary.passRate.toFixed(2)}% pass, ${parsed.summary.flaky} flaky, p95 ${Math.round(parsed.summary.p95DurationMs)} ms`,
    );
  } catch (error) {
    if (process.env.TEST_OBSERVABILITY_ALLOW_MISSING === 'true') {
      const markdown = `# Playwright test observability\n\nResult unavailable: ${sanitizeErrorMessage(String(error), repositoryRoot)}\n`;
      await publish(markdown, output);
      console.warn(
        '[test-observability] Result unavailable; a diagnostic summary was published.',
      );
      return;
    }
    throw error;
  }
}

main().catch((error: unknown) => {
  console.error(`[test-observability] ${sanitizeErrorMessage(String(error))}`);
  process.exitCode = 1;
});
