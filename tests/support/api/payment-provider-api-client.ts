import type { APIRequestContext, APIResponse } from '@playwright/test';

import { testPaymentProviderUrl } from './urls';

export const paymentScenarios = [
  'approved',
  'declined',
  'server-error',
  'transient-error',
  'slow',
  'timeout',
] as const;

export type PaymentScenario = (typeof paymentScenarios)[number];

export type PaymentAuthorizationInput = {
  amountCents: number;
  currency: 'USD';
  customerReference: string;
};

type AuthorizationOptions = {
  idempotencyKey: string;
  requestId?: string;
  scenario?: PaymentScenario;
};

export class PaymentProviderApiClient {
  constructor(private readonly request: APIRequestContext) {}

  health(): Promise<APIResponse> {
    return this.request.get(`${testPaymentProviderUrl}/health`);
  }

  authorize(
    input: PaymentAuthorizationInput,
    options: AuthorizationOptions,
  ): Promise<APIResponse> {
    return this.request.post(`${testPaymentProviderUrl}/payments/authorize`, {
      data: input,
      headers: {
        'idempotency-key': options.idempotencyKey,
        ...(options.requestId ? { 'x-request-id': options.requestId } : {}),
        ...(options.scenario
          ? { 'x-test-payment-scenario': options.scenario }
          : {}),
      },
    });
  }

  inspection(idempotencyKey: string): Promise<APIResponse> {
    return this.request.get(
      `${testPaymentProviderUrl}/__test/state/${encodeURIComponent(idempotencyKey)}`,
    );
  }
}
