import { errorResponseSchema } from '../support/api/auth-contracts';
import { paymentInspectionSchema } from '../support/api/payment-contracts';
import { expect, test } from '../support/fixtures';

test.describe('Subscription persistence @integration @subscription', () => {
  test('persists deterministic plan reference data', async ({ database }) => {
    expect(await database.countPlans()).toBe(3);
    expect(await database.listPlanCodes()).toEqual([
      'starter',
      'professional',
      'business',
    ]);
  });

  test('persists a plan change on the existing subscription', async ({
    authenticatedSubscriptionsApi,
    availablePlans,
    database,
    subscribedUser,
  }) => {
    expect(
      (
        await authenticatedSubscriptionsApi.changePlan({
          planId: availablePlans.professional.id,
        })
      ).status(),
    ).toBe(200);

    const stored = await database.findSubscriptionsByUser(
      subscribedUser.user.id,
    );

    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      id: subscribedUser.subscription.id,
      planId: availablePlans.professional.id,
      status: 'active',
    });
  });

  test('preserves the historical row after cancellation', async ({
    authenticatedSubscriptionsApi,
    database,
    subscribedUser,
  }) => {
    expect((await authenticatedSubscriptionsApi.cancel()).status()).toBe(200);

    const stored = await database.findSubscriptionsByUser(
      subscribedUser.user.id,
    );

    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      id: subscribedUser.subscription.id,
      status: 'cancelled',
    });
    expect(stored[0]?.cancelledAt).toBeInstanceOf(Date);
  });

  test('allows only one active subscription under concurrent requests @critical @concurrency', async ({
    authenticatedSubscriptionsApi,
    authenticatedUser,
    availablePlans,
    database,
    paymentKeyBuilder,
    paymentProviderApi,
  }) => {
    const starterKey = paymentKeyBuilder();
    const professionalKey = paymentKeyBuilder();
    const outcomes = await Promise.allSettled([
      authenticatedSubscriptionsApi.create(
        { planId: availablePlans.starter.id },
        { idempotencyKey: starterKey },
      ),
      authenticatedSubscriptionsApi.create(
        { planId: availablePlans.professional.id },
        { idempotencyKey: professionalKey },
      ),
    ]);
    const responses = outcomes.flatMap((outcome) =>
      outcome.status === 'fulfilled' ? [outcome.value] : [],
    );
    const statuses = responses.map((response) => response.status()).sort();
    const conflict = responses.find((response) => response.status() === 409);
    const activeCount = await database.countActiveSubscriptions(
      authenticatedUser.user.id,
    );
    const paymentCount = await database.countApprovedPaymentsForUser(
      authenticatedUser.user.id,
    );
    const providerInspections = await Promise.all(
      [starterKey, professionalKey].map(async (key) => {
        const response = await paymentProviderApi.inspection(key);
        return response.status() === 200
          ? [paymentInspectionSchema.parse(await response.json())]
          : [];
      }),
    );

    expect(
      outcomes.every((outcome) => outcome.status === 'fulfilled'),
      `request outcomes: ${outcomes.map(({ status }) => status).join(', ')}`,
    ).toBe(true);
    expect(statuses, `HTTP statuses: ${statuses.join(', ')}`).toEqual([
      201, 409,
    ]);
    expect(conflict).toBeDefined();
    expect(errorResponseSchema.parse(await conflict?.json()).error.code).toBe(
      'SUBSCRIPTION_ALREADY_ACTIVE',
    );
    expect(activeCount, `active subscription count: ${activeCount}`).toBe(1);
    expect(paymentCount, `approved payment count: ${paymentCount}`).toBe(1);
    expect(providerInspections.flat()).toHaveLength(1);
    expect(providerInspections.flat()[0]).toMatchObject({
      attempts: 1,
      logicalPayments: 1,
      status: 'approved',
    });
  });
});
