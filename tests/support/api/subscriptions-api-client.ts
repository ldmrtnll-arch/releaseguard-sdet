import type { APIRequestContext, APIResponse } from '@playwright/test';

import type { PaymentScenario } from './payment-provider-api-client';
import { testApiUrl } from './urls';

export type SubscriptionRequest = {
  planId?: string;
  [key: string]: unknown;
};

export class SubscriptionsApiClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly accessToken?: string,
  ) {}

  private options(
    data?: SubscriptionRequest,
    controls?: {
      idempotencyKey?: string;
      paymentScenario?: PaymentScenario;
      requestId?: string;
    },
  ) {
    return {
      data,
      headers: {
        ...(this.accessToken
          ? { authorization: `Bearer ${this.accessToken}` }
          : {}),
        ...(controls?.idempotencyKey
          ? { 'idempotency-key': controls.idempotencyKey }
          : {}),
        ...(controls?.paymentScenario
          ? { 'x-test-payment-scenario': controls.paymentScenario }
          : {}),
        ...(controls?.requestId ? { 'x-request-id': controls.requestId } : {}),
      },
    };
  }

  create(
    input: SubscriptionRequest,
    controls?: {
      idempotencyKey?: string;
      paymentScenario?: PaymentScenario;
      requestId?: string;
    },
  ): Promise<APIResponse> {
    return this.request.post(
      `${testApiUrl}/api/v1/subscriptions`,
      this.options(input, controls),
    );
  }

  current(): Promise<APIResponse> {
    return this.request.get(
      `${testApiUrl}/api/v1/subscriptions/current`,
      this.options(),
    );
  }

  changePlan(input: SubscriptionRequest): Promise<APIResponse> {
    return this.request.patch(
      `${testApiUrl}/api/v1/subscriptions/current`,
      this.options(input),
    );
  }

  cancel(): Promise<APIResponse> {
    return this.request.delete(
      `${testApiUrl}/api/v1/subscriptions/current`,
      this.options(),
    );
  }
}
