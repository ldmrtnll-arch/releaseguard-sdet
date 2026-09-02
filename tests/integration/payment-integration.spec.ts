import { randomUUID } from 'node:crypto';

import { errorResponseSchema } from '../support/api/auth-contracts';
import { paymentInspectionSchema } from '../support/api/payment-contracts';
import { subscriptionResponseSchema } from '../support/api/subscription-contracts';
import { expect, test } from '../support/fixtures';

test.describe('Payment service integration @integration @payment', () => {
  test('persists the real plan price after an approved authorization', async ({
    authenticatedSubscriptionsApi,
    authenticatedUser,
    availablePlans,
    database,
    paymentKeyBuilder,
    paymentProviderApi,
  }) => {
    const idempotencyKey = paymentKeyBuilder();
    const requestId = randomUUID();
    const response = await authenticatedSubscriptionsApi.create(
      { planId: availablePlans.starter.id },
      { idempotencyKey, requestId },
    );
    const subscription = subscriptionResponseSchema.parse(
      await response.json(),
    ).data;
    const payment = await database.findPaymentBySubscription(subscription.id);
    const providerState = paymentInspectionSchema.parse(
      await (await paymentProviderApi.inspection(idempotencyKey)).json(),
    );

    expect(response.status()).toBe(201);
    expect(payment).toMatchObject({
      amountCents: availablePlans.starter.priceCents,
      currency: 'USD',
      idempotencyKey,
      status: 'approved',
      userId: authenticatedUser.user.id,
    });
    expect(providerState).toMatchObject({
      attempts: 1,
      logicalPayments: 1,
      requestIds: [requestId],
      status: 'approved',
    });
    expect(payment?.providerPaymentId).toBe(providerState.paymentId);
  });

  test('does not retry or create local state when payment is declined', async ({
    authenticatedSubscriptionsApi,
    authenticatedUser,
    availablePlans,
    database,
    paymentKeyBuilder,
    paymentProviderApi,
  }) => {
    const idempotencyKey = paymentKeyBuilder();
    const response = await authenticatedSubscriptionsApi.create(
      { planId: availablePlans.starter.id },
      { idempotencyKey, paymentScenario: 'declined' },
    );
    const state = paymentInspectionSchema.parse(
      await (await paymentProviderApi.inspection(idempotencyKey)).json(),
    );

    expect(response.status()).toBe(402);
    expect(errorResponseSchema.parse(await response.json()).error.code).toBe(
      'PAYMENT_DECLINED',
    );
    expect(state).toMatchObject({
      attempts: 1,
      logicalPayments: 1,
      status: 'declined',
    });
    expect(
      await database.countActiveSubscriptions(authenticatedUser.user.id),
    ).toBe(0);
    expect(
      await database.countApprovedPaymentsForUser(authenticatedUser.user.id),
    ).toBe(0);
  });

  test('retries a stable server failure then returns an unavailable error', async ({
    authenticatedSubscriptionsApi,
    authenticatedUser,
    availablePlans,
    database,
    paymentKeyBuilder,
    paymentProviderApi,
  }) => {
    const idempotencyKey = paymentKeyBuilder();
    const response = await authenticatedSubscriptionsApi.create(
      { planId: availablePlans.starter.id },
      { idempotencyKey, paymentScenario: 'server-error' },
    );
    const state = paymentInspectionSchema.parse(
      await (await paymentProviderApi.inspection(idempotencyKey)).json(),
    );

    expect(response.status()).toBe(503);
    expect(errorResponseSchema.parse(await response.json()).error.code).toBe(
      'PAYMENT_PROVIDER_UNAVAILABLE',
    );
    expect(state).toMatchObject({ attempts: 2, logicalPayments: 0 });
    expect(
      await database.countActiveSubscriptions(authenticatedUser.user.id),
    ).toBe(0);
  });

  test('recovers from one transient failure with the same payment key @critical @retry @resilience', async ({
    authenticatedSubscriptionsApi,
    authenticatedUser,
    availablePlans,
    database,
    paymentKeyBuilder,
    paymentProviderApi,
  }) => {
    const idempotencyKey = paymentKeyBuilder();
    const requestId = randomUUID();
    const response = await authenticatedSubscriptionsApi.create(
      { planId: availablePlans.professional.id },
      {
        idempotencyKey,
        paymentScenario: 'transient-error',
        requestId,
      },
    );
    const state = paymentInspectionSchema.parse(
      await (await paymentProviderApi.inspection(idempotencyKey)).json(),
    );

    expect(response.status()).toBe(201);
    expect(state).toMatchObject({
      attempts: 2,
      logicalPayments: 1,
      requestIds: [requestId, requestId],
      status: 'approved',
    });
    expect(
      await database.countApprovedPaymentsForUser(authenticatedUser.user.id),
    ).toBe(1);
  });

  test('returns a timeout without creating local state @timeout @resilience', async ({
    authenticatedSubscriptionsApi,
    authenticatedUser,
    availablePlans,
    database,
    paymentKeyBuilder,
    paymentProviderApi,
  }) => {
    const idempotencyKey = paymentKeyBuilder();
    const startedAt = Date.now();
    const response = await authenticatedSubscriptionsApi.create(
      { planId: availablePlans.starter.id },
      { idempotencyKey, paymentScenario: 'timeout' },
    );
    const elapsedMs = Date.now() - startedAt;
    const state = paymentInspectionSchema.parse(
      await (await paymentProviderApi.inspection(idempotencyKey)).json(),
    );

    expect(response.status()).toBe(504);
    expect(errorResponseSchema.parse(await response.json()).error.code).toBe(
      'PAYMENT_PROVIDER_TIMEOUT',
    );
    expect(elapsedMs).toBeLessThan(1_500);
    expect(state.attempts).toBe(2);
    expect(
      await database.countActiveSubscriptions(authenticatedUser.user.id),
    ).toBe(0);
    expect(
      await database.countApprovedPaymentsForUser(authenticatedUser.user.id),
    ).toBe(0);
  });

  test('accepts a slow authorization that completes inside the timeout', async ({
    authenticatedSubscriptionsApi,
    authenticatedUser,
    availablePlans,
    database,
    paymentKeyBuilder,
  }) => {
    const response = await authenticatedSubscriptionsApi.create(
      { planId: availablePlans.business.id },
      {
        idempotencyKey: paymentKeyBuilder(),
        paymentScenario: 'slow',
      },
    );

    expect(response.status()).toBe(201);
    expect(
      await database.countApprovedPaymentsForUser(authenticatedUser.user.id),
    ).toBe(1);
  });

  test('authorizes a new payment when a cancelled user subscribes again', async ({
    authenticatedSubscriptionsApi,
    authenticatedUser,
    availablePlans,
    database,
    paymentKeyBuilder,
  }) => {
    expect(
      (
        await authenticatedSubscriptionsApi.create(
          { planId: availablePlans.starter.id },
          { idempotencyKey: paymentKeyBuilder() },
        )
      ).status(),
    ).toBe(201);
    expect((await authenticatedSubscriptionsApi.cancel()).status()).toBe(200);
    expect(
      (
        await authenticatedSubscriptionsApi.create(
          { planId: availablePlans.business.id },
          { idempotencyKey: paymentKeyBuilder() },
        )
      ).status(),
    ).toBe(201);

    expect(
      await database.countApprovedPaymentsForUser(authenticatedUser.user.id),
    ).toBe(2);
  });
});
