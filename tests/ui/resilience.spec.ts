import { expect, test } from '../support/fixtures';
import { PlansPage } from '../support/ui/plans-page';

test.describe('User-facing resilience @ui @regression @resilience', () => {
  test('settles on an unavailable state when API health cannot be reached', async ({
    page,
  }) => {
    await page.route('**/health', (route) => route.abort('connectionrefused'));
    await page.goto('/');

    await expect(page.getByRole('status')).toContainText('API unavailable');
    await expect(page.getByText('Checking API availability')).toHaveCount(0);
  });

  test('shows a stable error instead of an endless plans spinner', async ({
    page,
  }) => {
    await page.route('**/api/v1/plans', (route) =>
      route.fulfill({
        body: JSON.stringify({
          error: { code: 'PLANS_UNAVAILABLE', message: 'Internal detail' },
        }),
        contentType: 'application/json',
        status: 503,
      }),
    );
    await page.goto('/plans');

    await expect(page.getByRole('alert')).toHaveText(
      'We could not complete your request.',
    );
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(page.getByText('Internal detail')).toHaveCount(0);
  });

  test('clears an invalid session and redirects to sign in', async ({
    authenticatedPage,
  }) => {
    const { page } = authenticatedPage;
    await page.evaluate(() =>
      sessionStorage.setItem('releaseguard.accessToken', 'invalid-token'),
    );
    await page.goto('/subscription');

    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole('heading', { name: 'Sign in to ReleaseGuard' }),
    ).toBeVisible();
    await expect(
      page.evaluate(() => sessionStorage.getItem('releaseguard.accessToken')),
    ).resolves.toBeNull();
  });

  test('shows a readable payment decline and remains actionable', async ({
    authenticatedPage,
  }) => {
    const { page } = authenticatedPage;
    await page.setExtraHTTPHeaders({
      'x-test-payment-scenario': 'declined',
    });
    const plans = new PlansPage(page);
    await plans.navigate();
    await plans.choose('Starter');

    await expect(page.getByRole('alert')).toHaveText(
      'Your payment was declined. Please try another payment method.',
    );
    await expect(page).toHaveURL(/\/plans$/);
    await expect(
      plans.planCard('Starter').getByRole('button', { name: 'Choose Starter' }),
    ).toBeEnabled();
  });

  test('shows a readable provider outage and restores the plan CTA', async ({
    authenticatedPage,
  }) => {
    const { page } = authenticatedPage;
    await page.setExtraHTTPHeaders({
      'x-test-payment-scenario': 'server-error',
    });
    const plans = new PlansPage(page);
    await plans.navigate();
    await plans.choose('Professional');

    await expect(page.getByRole('alert')).toHaveText(
      'Payment authorization is temporarily unavailable. Please try again.',
    );
    await expect(page).toHaveURL(/\/plans$/);
    await expect(
      plans
        .planCard('Professional')
        .getByRole('button', { name: 'Choose Professional' }),
    ).toBeEnabled();
  });
});
