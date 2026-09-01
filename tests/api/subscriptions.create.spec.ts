import { randomUUID } from 'node:crypto';

import { errorResponseSchema } from '../support/api/auth-contracts';
import { subscriptionResponseSchema } from '../support/api/subscription-contracts';
import { SubscriptionsApiClient } from '../support/api/subscriptions-api-client';
import { expect, test } from '../support/fixtures';

test.describe('Subscription creation @api @subscription', () => {
  test('creates an active subscription for an authenticated user @smoke', async ({
    authenticatedSubscriptionsApi,
    availablePlans,
  }) => {
    const before = Date.now();
    const response = await authenticatedSubscriptionsApi.create({
      planId: availablePlans.starter.id,
    });
    const body = subscriptionResponseSchema.parse(await response.json());

    expect(response.status()).toBe(201);
    expect(response.headers()['content-type']).toContain('application/json');
    expect(body.data).toMatchObject({
      cancelledAt: null,
      plan: availablePlans.starter,
      status: 'active',
    });
    expect(Date.parse(body.data.startedAt)).toBeGreaterThanOrEqual(before);
    expect(Date.parse(body.data.startedAt)).toBeLessThanOrEqual(Date.now());
  });

  test('rejects creation without authentication @regression', async ({
    availablePlans,
    subscriptionsApi,
  }) => {
    const response = await subscriptionsApi.create({
      planId: availablePlans.starter.id,
    });
    const body = errorResponseSchema.parse(await response.json());

    expect(response.status()).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  test('rejects creation with an invalid token @security', async ({
    availablePlans,
    request,
  }) => {
    const response = await new SubscriptionsApiClient(
      request,
      'invalid-token',
    ).create({ planId: availablePlans.starter.id });
    const body = errorResponseSchema.parse(await response.json());

    expect(response.status()).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  test('returns PLAN_NOT_FOUND for an unknown plan @regression', async ({
    authenticatedSubscriptionsApi,
  }) => {
    const response = await authenticatedSubscriptionsApi.create({
      planId: randomUUID(),
    });
    const body = errorResponseSchema.parse(await response.json());

    expect(response.status()).toBe(404);
    expect(body.error.code).toBe('PLAN_NOT_FOUND');
  });

  test('rejects a second active subscription @critical @regression', async ({
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

    const response = await authenticatedSubscriptionsApi.create({
      planId: availablePlans.professional.id,
    });
    const body = errorResponseSchema.parse(await response.json());

    expect(response.status()).toBe(409);
    expect(body.error.code).toBe('SUBSCRIPTION_ALREADY_ACTIVE');
  });

  test('rejects an unexpected userId instead of changing ownership @security', async ({
    authenticatedSubscriptionsApi,
    availablePlans,
  }) => {
    const response = await authenticatedSubscriptionsApi.create({
      planId: availablePlans.starter.id,
      userId: randomUUID(),
    });
    const body = errorResponseSchema.parse(await response.json());

    expect(response.status()).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
