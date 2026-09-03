import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

export async function expectNoAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();

  if (results.violations.length === 0) return;

  const summary = results.violations
    .map((violation) => {
      const targets = violation.nodes
        .flatMap((node) => node.target)
        .map(String)
        .join(', ');

      return `${violation.id} [${violation.impact ?? 'unknown impact'}]: ${violation.help}\n  ${targets}`;
    })
    .join('\n');

  throw new Error(
    `${results.violations.length} accessibility violation(s) found:\n${summary}`,
  );
}
