import { expect, test } from '../support/fixtures';
import { SubscriptionPage } from '../support/ui/subscription-page';

const visualOptions = {
  animations: 'disabled' as const,
  caret: 'hide' as const,
  maxDiffPixelRatio: 0.001,
  scale: 'css' as const,
};

test.describe('Selective visual regression @visual', () => {
  test('captures the home hero', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('.hero');
    await expect(hero.getByRole('status')).toContainText('API available');

    await expect(hero).toHaveScreenshot('home-hero.png', visualOptions);
  });

  test('captures the loaded pricing layout', async ({ page }) => {
    await page.goto('/plans');
    const content = page.locator('.content-page');
    await expect(
      content.getByRole('heading', { level: 2, name: 'Business' }),
    ).toBeVisible();

    await expect(content).toHaveScreenshot('plans-page.png', visualOptions);
  });

  test('captures the active subscription card', async ({ subscribedPage }) => {
    await subscribedPage.page.goto('/subscription');
    const card = subscribedPage.page.locator('.subscription-card');
    await expect(card.getByText('Active subscription')).toBeVisible();

    await expect(card).toHaveScreenshot('active-subscription-card.png', {
      ...visualOptions,
      mask: [card.locator('.subscription-details div').nth(1).locator('dd')],
      maskColor: '#0b1525',
    });
  });

  test('captures the cancellation confirmation dialog', async ({
    subscribedPage,
  }) => {
    const { page } = subscribedPage;
    const subscription = new SubscriptionPage(page);
    await subscription.navigate();
    await subscription.openCancellation();

    const dialog = page.getByRole('dialog', {
      name: 'Cancel your subscription?',
    });
    await expect(dialog).toBeVisible();

    await expect(dialog).toHaveScreenshot(
      'cancel-subscription-dialog.png',
      visualOptions,
    );
  });
});
