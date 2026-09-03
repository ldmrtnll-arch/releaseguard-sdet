import { expect, test } from '../support/fixtures';
import { expectNoAccessibilityViolations } from '../support/accessibility';
import { SubscriptionPage } from '../support/ui/subscription-page';

test.describe('Critical accessibility scans @a11y', () => {
  test('scans the home page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('status')).toContainText('API available');

    await expectNoAccessibilityViolations(page);
  });

  test('scans the registration form', async ({ page }) => {
    await page.goto('/register');
    await expect(
      page.getByRole('heading', { name: 'Create your account' }),
    ).toBeVisible();

    await expectNoAccessibilityViolations(page);
  });

  test('scans the login form', async ({ page }) => {
    await page.goto('/login');
    await expect(
      page.getByRole('heading', { name: 'Sign in to ReleaseGuard' }),
    ).toBeVisible();

    await expectNoAccessibilityViolations(page);
  });

  test('scans the loaded plans page', async ({ page }) => {
    await page.goto('/plans');
    await expect(
      page.getByRole('heading', { level: 2, name: 'Business' }),
    ).toBeVisible();

    await expectNoAccessibilityViolations(page);
  });

  test('scans an active subscription prepared through the API', async ({
    subscribedPage,
  }) => {
    await subscribedPage.page.goto('/subscription');
    await expect(
      subscribedPage.page.getByText('Active subscription'),
    ).toBeVisible();

    await expectNoAccessibilityViolations(subscribedPage.page);
  });

  test('scans the cancellation dialog and checks keyboard focus', async ({
    subscribedPage,
  }) => {
    const { page } = subscribedPage;
    const subscription = new SubscriptionPage(page);
    const trigger = page.getByRole('button', { name: 'Cancel subscription' });

    await subscription.navigate();
    await trigger.focus();
    await expect(trigger).toBeFocused();
    await page.keyboard.press('Enter');

    const dialog = page.getByRole('dialog', {
      name: 'Cancel your subscription?',
    });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: 'Keep subscription' }),
    ).toBeFocused();
    await expectNoAccessibilityViolations(page);

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
  });
});
