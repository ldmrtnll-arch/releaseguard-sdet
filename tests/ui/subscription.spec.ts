import { expect, test } from '../support/fixtures';
import { LoginPage } from '../support/ui/login-page';
import { PlansPage } from '../support/ui/plans-page';
import { RegisterPage } from '../support/ui/register-page';
import { SubscriptionPage } from '../support/ui/subscription-page';

test.describe('Subscription lifecycle @ui', () => {
  test('subscribes an authenticated user to a plan @smoke', async ({
    authenticatedPage,
  }) => {
    const { page } = authenticatedPage;
    const plans = new PlansPage(page);
    await plans.navigate();
    await plans.choose('Starter');

    await expect(page).toHaveURL(/\/subscription$/);
    await expect(
      page.getByRole('heading', { level: 2, name: 'Starter' }),
    ).toBeVisible();
    await expect(page.getByText('Active subscription')).toBeVisible();
  });

  test('changes the active plan @regression', async ({ subscribedPage }) => {
    const { page } = subscribedPage;
    const subscription = new SubscriptionPage(page);
    const plans = new PlansPage(page);

    await subscription.navigate();
    await subscription.changePlan();
    await plans.choose('Professional');

    await expect(page).toHaveURL(/\/subscription$/);
    await expect(
      page.getByRole('heading', { level: 2, name: 'Professional' }),
    ).toBeVisible();
  });

  test('cancels an active subscription after confirmation @regression', async ({
    subscribedPage,
  }) => {
    const { page } = subscribedPage;
    const subscription = new SubscriptionPage(page);
    await subscription.navigate();
    await subscription.openCancellation();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Cancel your subscription?' }),
    ).toBeVisible();
    await subscription.confirmCancellation();

    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'No active subscription' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Choose a plan' }),
    ).toBeVisible();
  });

  test('keeps an active subscription when cancellation is dismissed @regression', async ({
    subscribedPage,
  }) => {
    const { page } = subscribedPage;
    const subscription = new SubscriptionPage(page);
    await subscription.navigate();
    const cancelButton = page.getByRole('button', {
      name: 'Cancel subscription',
    });
    await subscription.openCancellation();
    await subscription.keepSubscription();

    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(
      page.getByRole('heading', { level: 2, name: 'Starter' }),
    ).toBeVisible();
    await expect(cancelButton).toBeFocused();
  });

  test('allows a cancelled customer to subscribe again @regression', async ({
    authenticatedPage,
    authenticatedSubscriptionsApi,
    availablePlans,
  }) => {
    expect(
      (
        await authenticatedSubscriptionsApi.create({
          planId: availablePlans.starter.id,
        })
      ).status(),
    ).toBe(201);
    expect((await authenticatedSubscriptionsApi.cancel()).status()).toBe(200);

    const { page } = authenticatedPage;
    const plans = new PlansPage(page);
    await plans.navigate();
    await plans.choose('Business');

    await expect(page).toHaveURL(/\/subscription$/);
    await expect(
      page.getByRole('heading', { level: 2, name: 'Business' }),
    ).toBeVisible();
  });

  test('completes the critical browser-only lifecycle @critical @regression', async ({
    page,
    userBuilder,
  }) => {
    const runtimeErrors: string[] = [];
    const serverErrors: string[] = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    page.on('response', (response) => {
      if (response.status() >= 500) {
        serverErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    const user = userBuilder();
    const register = new RegisterPage(page);
    const login = new LoginPage(page);
    const plans = new PlansPage(page);
    const subscription = new SubscriptionPage(page);

    await register.navigate();
    await register.register(user);
    await expect(page).toHaveURL(/\/login$/);
    await login.login(user.email, user.password);
    await plans.choose('Starter');
    await expect(
      page.getByRole('heading', { level: 2, name: 'Starter' }),
    ).toBeVisible();

    await subscription.changePlan();
    await plans.choose('Professional');
    await expect(
      page.getByRole('heading', { level: 2, name: 'Professional' }),
    ).toBeVisible();

    await subscription.openCancellation();
    await subscription.confirmCancellation();
    await expect(
      page.getByRole('heading', { name: 'No active subscription' }),
    ).toBeVisible();
    expect(serverErrors).toEqual([]);
    expect(runtimeErrors).toEqual([]);
  });
});
