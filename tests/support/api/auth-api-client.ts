import type { APIRequestContext, APIResponse } from '@playwright/test';

import type { UserTestData } from '@releaseguard/test-data';

export type LoginRequest = Pick<UserTestData, 'email' | 'password'>;
export type RegisterRequest = Partial<UserTestData>;

export class AuthApiClient {
  constructor(private readonly request: APIRequestContext) {}

  register(user: RegisterRequest): Promise<APIResponse> {
    return this.request.post('/api/v1/auth/register', { data: user });
  }

  login(credentials: LoginRequest): Promise<APIResponse> {
    return this.request.post('/api/v1/auth/login', { data: credentials });
  }

  me(accessToken?: string): Promise<APIResponse> {
    return this.request.get('/api/v1/auth/me', {
      headers: accessToken
        ? { authorization: `Bearer ${accessToken}` }
        : undefined,
    });
  }
}
