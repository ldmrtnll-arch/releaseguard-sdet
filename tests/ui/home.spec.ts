import { expect, test } from '@playwright/test';

test.describe('Application home @ui @smoke @critical', () => {
  test('shows API availability on the application home page', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Quality engineered into every release.',
      }),
    ).toBeVisible();
    await expect(page.getByRole('status')).toContainText('API available');
  });
});
