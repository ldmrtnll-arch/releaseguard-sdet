import { randomUUID } from 'node:crypto';

import { errorResponseSchema } from '../support/api/auth-contracts';
import { subscriptionResponseSchema } from '../support/api/subscription-contracts';
import { expect, test } from '../support/fixtures';

test.describe('Subscription plan change @api @subscription', () => {
  test('changes from Starter to Professional @regression', async ({
    authenticatedSubscriptionsApi,
    availablePlans,
    subscribedUser,
  }) => {
    expect(subscribedUser.subscription.plan.code).toBe('starter');
    const response = await authenticatedSubscriptionsApi.changePlan({
      planId: availablePlans.professional.id,
    });
    const body = subscriptionResponseSchema.parse(await response.json());

    expect(response.status()).toBe(200);
    expect(body.data.id).toBe(subscribedUser.subscription.id);
    expect(body.data.plan).toEqual(availablePlans.professional);
    expect(body.data.status).toBe('active');
  });

  test('rejects changing to the current plan @regression', async ({
    authenticatedSubscriptionsApi,
    subscribedUser,
  }) => {
    const response = await authenticatedSubscriptionsApi.changePlan({
      planId: subscribedUser.subscription.plan.id,
    });
    const body = errorResponseSchema.parse(await response.json());

    expect(response.status()).toBe(409);
    expect(body.error.code).toBe('SUBSCRIPTION_ALREADY_ON_PLAN');
  });

  test('rejects a change without an active subscription @regression', async ({
    authenticatedSubscriptionsApi,
    availablePlans,
  }) => {
    const response = await authenticatedSubscriptionsApi.changePlan({
      planId: availablePlans.professional.id,
    });
    const body = errorResponseSchema.parse(await response.json());

    expect(response.status()).toBe(404);
    expect(body.error.code).toBe('SUBSCRIPTION_NOT_FOUND');
  });

  test('rejects an unknown target plan @regression', async ({
    authenticatedSubscriptionsApi,
    subscribedUser,
  }) => {
    expect(subscribedUser.subscription.status).toBe('active');
    const response = await authenticatedSubscriptionsApi.changePlan({
      planId: randomUUID(),
    });
    const body = errorResponseSchema.parse(await response.json());

    expect(response.status()).toBe(404);
    expect(body.error.code).toBe('PLAN_NOT_FOUND');
  });
});
