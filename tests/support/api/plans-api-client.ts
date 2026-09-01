import type { APIRequestContext, APIResponse } from '@playwright/test';

export class PlansApiClient {
  constructor(private readonly request: APIRequestContext) {}

  list(): Promise<APIResponse> {
    return this.request.get('/api/v1/plans');
  }

  get(id: string): Promise<APIResponse> {
    return this.request.get(`/api/v1/plans/${id}`);
  }
}
