import { rmSync } from 'node:fs';

import { Matchers, Pact, SpecificationVersion } from '@pact-foundation/pact';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  createPaymentProviderClient,
  PaymentProviderUnavailableError,
} from '../../../apps/api/src/payments/payment-provider-client';
import {
  contractConsumer,
  contractProvider,
  contractRequests,
  pactDirectory,
} from '../contract-config';

type ContractRequest = (typeof contractRequests)[keyof typeof contractRequests];

const provider = new Pact({
  consumer: contractConsumer,
  dir: pactDirectory,
  logLevel: 'error',
  provider: contractProvider,
  spec: SpecificationVersion.SPECIFICATION_VERSION_V4,
});

type UnconfiguredInteraction = ReturnType<typeof provider.addInteraction>;
type DescribedInteraction = ReturnType<
  ReturnType<UnconfiguredInteraction['given']>['uponReceiving']
>;
type RequestBuilderCallback = NonNullable<
  Parameters<DescribedInteraction['withRequest']>[2]
>;

function client(url: string) {
  return createPaymentProviderClient({
    maxAttempts: 1,
    timeoutMs: 2_000,
    url,
  });
}

function expectedPayment(status: 'approved' | 'declined') {
  return {
    amountCents: Matchers.integer(contractRequests.approved.amountCents),
    currency: contractRequests.approved.currency,
    paymentId: Matchers.uuid('3d5f2047-dfe8-4e15-9a67-91aebc76bd7d'),
    status,
  };
}

function authorizationRequest(input: ContractRequest): RequestBuilderCallback {
  return (builder) => {
    builder.headers({
      'Content-Type': 'application/json',
      'Idempotency-Key': input.idempotencyKey,
      'X-Request-ID': Matchers.uuid(input.requestId),
    });
    builder.jsonBody({
      amountCents: input.amountCents,
      currency: input.currency,
      customerReference: input.customerReference,
    });
  };
}

describe('PaymentProviderClient consumer contract @contract', () => {
  beforeAll(() => {
    rmSync(pactDirectory, { force: true, recursive: true });
  });

  it('authorizes an approved payment according to the provider contract', () =>
    provider
      .addInteraction()
      .given('payment can be approved')
      .uponReceiving('a valid payment authorization that is approved')
      .withRequest(
        'POST',
        '/payments/authorize',
        authorizationRequest(contractRequests.approved),
      )
      .willRespondWith(200, (builder) => {
        builder.jsonBody(expectedPayment('approved'));
      })
      .executeTest(async (server) => {
        await expect(
          client(server.url).authorize(contractRequests.approved),
        ).resolves.toMatchObject({
          amountCents: contractRequests.approved.amountCents,
          currency: 'USD',
          status: 'approved',
        });
      }));

  it('handles a declined payment according to the provider contract', () =>
    provider
      .addInteraction()
      .given('payment will be declined')
      .uponReceiving('a valid payment authorization that is declined')
      .withRequest(
        'POST',
        '/payments/authorize',
        authorizationRequest(contractRequests.declined),
      )
      .willRespondWith(200, (builder) => {
        builder.jsonBody(expectedPayment('declined'));
      })
      .executeTest(async (server) => {
        await expect(
          client(server.url).authorize(contractRequests.declined),
        ).resolves.toMatchObject({
          status: 'declined',
        });
      }));

  it('maps a provider server error according to the contract', () =>
    provider
      .addInteraction()
      .given('provider returns an internal error')
      .uponReceiving('a valid payment authorization during a provider failure')
      .withRequest(
        'POST',
        '/payments/authorize',
        authorizationRequest(contractRequests.serverError),
      )
      .willRespondWith(500)
      .executeTest(async (server) => {
        await expect(
          client(server.url).authorize(contractRequests.serverError),
        ).rejects.toBeInstanceOf(PaymentProviderUnavailableError);
      }));
});
