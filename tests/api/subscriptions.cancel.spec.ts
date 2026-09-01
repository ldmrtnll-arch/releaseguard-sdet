import { errorResponseSchema } from '../support/api/auth-contracts';
import { subscriptionResponseSchema } from '../support/api/subscription-contracts';
import { expect, test } from '../support/fixtures';

test.describe('Subscription cancellation @api @subscription', () => {
  test('cancels an active subscription @regression', async ({
    authenticatedSubscriptionsApi,
    subscribedUser,
  }) => {
    const before = Date.now();
    const response = await authenticatedSubscriptionsApi.cancel();
    const body = subscriptionResponseSchema.parse(await response.json());

    expect(response.status()).toBe(200);
    expect(body.data.id).toBe(subscribedUser.subscription.id);
    expect(body.data.status).toBe('cancelled');
    expect(body.data.cancelledAt).not.toBeNull();
    expect(Date.parse(body.data.cancelledAt ?? '')).toBeGreaterThanOrEqual(
      before,
    );
  });

  test('has no current subscription after cancellation @regression', async ({
    authenticatedSubscriptionsApi,
    subscribedUser,
  }) => {
    expect(subscribedUser.subscription.status).toBe('active');
    expect((await authenticatedSubscriptionsApi.cancel()).status()).toBe(200);

    const response = await authenticatedSubscriptionsApi.current();
    const body = errorResponseSchema.parse(await response.json());

    expect(response.status()).toBe(404);
    expect(body.error.code).toBe('SUBSCRIPTION_NOT_FOUND');
  });

  test('returns SUBSCRIPTION_NOT_FOUND when cancelled twice @regression', async ({
    authenticatedSubscriptionsApi,
    subscribedUser,
  }) => {
    expect(subscribedUser.subscription.status).toBe('active');
    expect((await authenticatedSubscriptionsApi.cancel()).status()).toBe(200);

    const response = await authenticatedSubscriptionsApi.cancel();
    const body = errorResponseSchema.parse(await response.json());

    expect(response.status()).toBe(404);
    expect(body.error.code).toBe('SUBSCRIPTION_NOT_FOUND');
  });
});
