import { expect, test } from '../support/fixtures';

test.describe('Application home @ui', () => {
  test('shows API availability and primary actions @smoke', async ({
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
    await expect(
      page.getByRole('link', { name: 'Explore plans' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Create account' }).first(),
    ).toBeVisible();
  });
});
