import type { APIRequestContext, APIResponse } from '@playwright/test';

export type SubscriptionRequest = {
  planId?: string;
  [key: string]: unknown;
};

export class SubscriptionsApiClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly accessToken?: string,
  ) {}

  private options(data?: SubscriptionRequest) {
    return {
      data,
      headers: this.accessToken
        ? { authorization: `Bearer ${this.accessToken}` }
        : undefined,
    };
  }

  create(input: SubscriptionRequest): Promise<APIResponse> {
    return this.request.post('/api/v1/subscriptions', this.options(input));
  }

  current(): Promise<APIResponse> {
    return this.request.get('/api/v1/subscriptions/current', this.options());
  }

  changePlan(input: SubscriptionRequest): Promise<APIResponse> {
    return this.request.patch(
      '/api/v1/subscriptions/current',
      this.options(input),
    );
  }

  cancel(): Promise<APIResponse> {
    return this.request.delete('/api/v1/subscriptions/current', this.options());
  }
}
