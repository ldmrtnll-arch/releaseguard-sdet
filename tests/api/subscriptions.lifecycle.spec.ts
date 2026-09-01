import { errorResponseSchema } from '../support/api/auth-contracts';
import {
  planListResponseSchema,
  subscriptionResponseSchema,
} from '../support/api/subscription-contracts';
import { expect, test } from '../support/fixtures';

test.describe('Subscription lifecycle @api @subscription', () => {
  test('moves from none to active, changed, cancelled, and active again @critical @lifecycle', async ({
    authenticatedSubscriptionsApi,
    plansApi,
  }) => {
    const plansResponse = await plansApi.list();
    const plans = planListResponseSchema.parse(await plansResponse.json()).data;
    const byCode = new Map(plans.map((plan) => [plan.code, plan]));
    const starter = byCode.get('starter');
    const professional = byCode.get('professional');
    const business = byCode.get('business');

    expect(plansResponse.status()).toBe(200);
    expect(starter).toBeDefined();
    expect(professional).toBeDefined();
    expect(business).toBeDefined();

    const created = subscriptionResponseSchema.parse(
      await (
        await authenticatedSubscriptionsApi.create({ planId: starter?.id })
      ).json(),
    ).data;
    expect(created).toMatchObject({ status: 'active', plan: starter });

    const current = subscriptionResponseSchema.parse(
      await (await authenticatedSubscriptionsApi.current()).json(),
    ).data;
    expect(current.id).toBe(created.id);

    const changed = subscriptionResponseSchema.parse(
      await (
        await authenticatedSubscriptionsApi.changePlan({
          planId: professional?.id,
        })
      ).json(),
    ).data;
    expect(changed).toMatchObject({ id: created.id, plan: professional });

    const cancelled = subscriptionResponseSchema.parse(
      await (await authenticatedSubscriptionsApi.cancel()).json(),
    ).data;
    expect(cancelled.status).toBe('cancelled');

    const noCurrent = await authenticatedSubscriptionsApi.current();
    expect(noCurrent.status()).toBe(404);
    expect(errorResponseSchema.parse(await noCurrent.json()).error.code).toBe(
      'SUBSCRIPTION_NOT_FOUND',
    );

    const resubscribed = subscriptionResponseSchema.parse(
      await (
        await authenticatedSubscriptionsApi.create({ planId: business?.id })
      ).json(),
    ).data;
    expect(resubscribed).toMatchObject({ status: 'active', plan: business });
    expect(resubscribed.id).not.toBe(created.id);
  });
});
