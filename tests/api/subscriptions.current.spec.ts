import { AuthApiClient } from '../support/api/auth-api-client';
import {
  errorResponseSchema,
  loginResponseSchema,
} from '../support/api/auth-contracts';
import { subscriptionResponseSchema } from '../support/api/subscription-contracts';
import { SubscriptionsApiClient } from '../support/api/subscriptions-api-client';
import { expect, test } from '../support/fixtures';

test.describe('Current subscription @api @subscription', () => {
  test('returns the authenticated user active subscription @smoke', async ({
    authenticatedSubscriptionsApi,
    subscribedUser,
  }) => {
    const response = await authenticatedSubscriptionsApi.current();
    const body = subscriptionResponseSchema.parse(await response.json());

    expect(response.status()).toBe(200);
    expect(body.data).toEqual(subscribedUser.subscription);
  });

  test('returns SUBSCRIPTION_NOT_FOUND when there is no active subscription @regression', async ({
    authenticatedSubscriptionsApi,
  }) => {
    const response = await authenticatedSubscriptionsApi.current();
    const body = errorResponseSchema.parse(await response.json());

    expect(response.status()).toBe(404);
    expect(body.error.code).toBe('SUBSCRIPTION_NOT_FOUND');
  });

  test('does not expose another user subscription @security', async ({
    authApi,
    authenticatedSubscriptionsApi,
    availablePlans,
    request,
    userBuilder,
  }) => {
    const otherData = userBuilder();
    expect((await authApi.register(otherData)).status()).toBe(201);
    const login = loginResponseSchema.parse(
      await (await new AuthApiClient(request).login(otherData)).json(),
    );
    const otherSubscriptions = new SubscriptionsApiClient(
      request,
      login.accessToken,
    );
    expect(
      (
        await otherSubscriptions.create({ planId: availablePlans.starter.id })
      ).status(),
    ).toBe(201);

    const response = await authenticatedSubscriptionsApi.current();
    const body = errorResponseSchema.parse(await response.json());

    expect(response.status()).toBe(404);
    expect(body.error.code).toBe('SUBSCRIPTION_NOT_FOUND');
  });
});
