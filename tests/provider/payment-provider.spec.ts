import { randomUUID } from 'node:crypto';

import {
  paymentInspectionSchema,
  paymentResponseSchema,
} from '../support/api/payment-contracts';
import { testPaymentProviderUrl } from '../support/api/urls';
import { expect, test } from '../support/fixtures';

const customerReference = '00000000-0000-4000-8000-000000000099';
const starterPayment = {
  amountCents: 900,
  currency: 'USD' as const,
  customerReference,
};

test.describe('Fake Payment Provider @payment', () => {
  test('reports service health @smoke', async ({ paymentProviderApi }) => {
    const response = await paymentProviderApi.health();

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });

  test('approves a valid authorization by default', async ({
    paymentKeyBuilder,
    paymentProviderApi,
  }) => {
    const response = await paymentProviderApi.authorize(starterPayment, {
      idempotencyKey: paymentKeyBuilder(),
    });
    const payment = paymentResponseSchema.parse(await response.json());

    expect(response.status()).toBe(200);
    expect(payment).toMatchObject({
      amountCents: 900,
      currency: 'USD',
      status: 'approved',
    });
  });

  test('returns a business decline without a technical error', async ({
    paymentKeyBuilder,
    paymentProviderApi,
  }) => {
    const response = await paymentProviderApi.authorize(starterPayment, {
      idempotencyKey: paymentKeyBuilder(),
      scenario: 'declined',
    });

    expect(response.status()).toBe(200);
    expect(paymentResponseSchema.parse(await response.json()).status).toBe(
      'declined',
    );
  });

  test('injects a stable server error without stopping the service', async ({
    paymentKeyBuilder,
    paymentProviderApi,
  }) => {
    const response = await paymentProviderApi.authorize(starterPayment, {
      idempotencyKey: paymentKeyBuilder(),
      scenario: 'server-error',
    });

    expect(response.status()).toBe(500);
    expect(await response.json()).toMatchObject({
      error: { code: 'PROVIDER_INTERNAL_ERROR' },
    });
    expect((await paymentProviderApi.health()).status()).toBe(200);
  });

  test('accepts a slow authorization below the client timeout', async ({
    paymentKeyBuilder,
    paymentProviderApi,
  }) => {
    const key = paymentKeyBuilder();
    const response = await paymentProviderApi.authorize(starterPayment, {
      idempotencyKey: key,
      scenario: 'slow',
    });
    const state = paymentInspectionSchema.parse(
      await (await paymentProviderApi.inspection(key)).json(),
    );

    expect(response.status()).toBe(200);
    expect(state).toMatchObject({ scenario: 'slow', status: 'approved' });
  });

  test('replays the same logical payment for the same key and payload @idempotency', async ({
    paymentKeyBuilder,
    paymentProviderApi,
  }) => {
    const key = paymentKeyBuilder();
    const first = paymentResponseSchema.parse(
      await (
        await paymentProviderApi.authorize(starterPayment, {
          idempotencyKey: key,
        })
      ).json(),
    );
    const second = paymentResponseSchema.parse(
      await (
        await paymentProviderApi.authorize(starterPayment, {
          idempotencyKey: key,
        })
      ).json(),
    );
    const state = paymentInspectionSchema.parse(
      await (await paymentProviderApi.inspection(key)).json(),
    );

    expect(second).toEqual(first);
    expect(state).toMatchObject({ attempts: 2, logicalPayments: 1 });
  });

  test('rejects reuse of a key with a different payload @idempotency', async ({
    paymentKeyBuilder,
    paymentProviderApi,
  }) => {
    const key = paymentKeyBuilder();
    expect(
      (
        await paymentProviderApi.authorize(starterPayment, {
          idempotencyKey: key,
        })
      ).status(),
    ).toBe(200);
    const conflict = await paymentProviderApi.authorize(
      { ...starterPayment, amountCents: 2900 },
      { idempotencyKey: key },
    );

    expect(conflict.status()).toBe(409);
    expect(await conflict.json()).toMatchObject({
      error: { code: 'IDEMPOTENCY_KEY_REUSED' },
    });
  });

  test('creates one logical payment for concurrent same-key calls @critical @concurrency @idempotency', async ({
    paymentKeyBuilder,
    paymentProviderApi,
  }) => {
    const key = paymentKeyBuilder();
    const outcomes = await Promise.allSettled([
      paymentProviderApi.authorize(starterPayment, { idempotencyKey: key }),
      paymentProviderApi.authorize(starterPayment, { idempotencyKey: key }),
    ]);
    const responses = outcomes.flatMap((outcome) =>
      outcome.status === 'fulfilled' ? [outcome.value] : [],
    );
    const payments = await Promise.all(
      responses.map(async (response) =>
        paymentResponseSchema.parse(await response.json()),
      ),
    );
    const state = paymentInspectionSchema.parse(
      await (await paymentProviderApi.inspection(key)).json(),
    );

    expect(outcomes.every(({ status }) => status === 'fulfilled')).toBe(true);
    expect(responses.map((response) => response.status())).toEqual([200, 200]);
    expect(new Set(payments.map(({ paymentId }) => paymentId)).size).toBe(1);
    expect(state).toMatchObject({ attempts: 2, logicalPayments: 1 });
  });

  test('fails once then approves and replays a transient scenario @retry', async ({
    paymentKeyBuilder,
    paymentProviderApi,
  }) => {
    const key = paymentKeyBuilder();
    const options = {
      idempotencyKey: key,
      requestId: randomUUID(),
      scenario: 'transient-error' as const,
    };
    const first = await paymentProviderApi.authorize(starterPayment, options);
    const second = await paymentProviderApi.authorize(starterPayment, options);
    const third = await paymentProviderApi.authorize(starterPayment, options);
    const secondPayment = paymentResponseSchema.parse(await second.json());
    const thirdPayment = paymentResponseSchema.parse(await third.json());
    const state = paymentInspectionSchema.parse(
      await (await paymentProviderApi.inspection(key)).json(),
    );

    expect(first.status()).toBe(500);
    expect(second.status()).toBe(200);
    expect(thirdPayment).toEqual(secondPayment);
    expect(state).toMatchObject({ attempts: 3, logicalPayments: 1 });
  });

  test('rejects invalid amount, currency, and unexpected fields', async ({
    paymentKeyBuilder,
    request,
  }) => {
    const response = await request.post(
      `${testPaymentProviderUrl}/payments/authorize`,
      {
        data: {
          amountCents: 9.5,
          currency: 'USD',
          customerReference,
          unexpected: true,
        },
        headers: { 'idempotency-key': paymentKeyBuilder() },
      },
    );

    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: 'VALIDATION_ERROR' },
    });
  });
});
