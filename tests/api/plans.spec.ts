import { randomUUID } from 'node:crypto';

import { errorResponseSchema } from '../support/api/auth-contracts';
import {
  planListResponseSchema,
  planResponseSchema,
} from '../support/api/subscription-contracts';
import { expect, test } from '../support/fixtures';

test.describe('Plans @api @plans', () => {
  test('lists active plans in deterministic price order @smoke', async ({
    plansApi,
  }) => {
    const response = await plansApi.list();
    const body = planListResponseSchema.parse(await response.json());

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    expect(body.data.map(({ code }) => code)).toEqual([
      'starter',
      'professional',
      'business',
    ]);
    expect(body.data.map(({ priceCents }) => priceCents)).toEqual([
      900, 2900, 7900,
    ]);
    expect(
      body.data.every(({ billingInterval }) => billingInterval === 'monthly'),
    ).toBe(true);
  });

  test('returns a plan by id @regression', async ({
    availablePlans,
    plansApi,
  }) => {
    const response = await plansApi.get(availablePlans.professional.id);
    const body = planResponseSchema.parse(await response.json());

    expect(response.status()).toBe(200);
    expect(body.data).toEqual(availablePlans.professional);
  });

  test('returns PLAN_NOT_FOUND for an unknown plan @regression', async ({
    plansApi,
  }) => {
    const response = await plansApi.get(randomUUID());
    const body = errorResponseSchema.parse(await response.json());

    expect(response.status()).toBe(404);
    expect(body.error.code).toBe('PLAN_NOT_FOUND');
  });

  test('rejects an invalid plan UUID predictably @regression', async ({
    plansApi,
  }) => {
    const response = await plansApi.get('not-a-uuid');
    const body = errorResponseSchema.parse(await response.json());

    expect(response.status()).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
