import {
  errorResponseSchema,
  registerResponseSchema,
} from '../support/api/auth-contracts';
import { expect, test } from '../support/fixtures';

test.describe('Current user @api @auth', () => {
  test('returns the current user for a valid access token @smoke', async ({
    authenticatedUser,
    authApi,
  }) => {
    const response = await authApi.me(authenticatedUser.accessToken);
    const body = registerResponseSchema.parse(await response.json());

    expect(response.status()).toBe(200);
    expect(body.user).toMatchObject(authenticatedUser.user);
  });

  test('rejects a request without an access token @regression', async ({
    authApi,
  }) => {
    const response = await authApi.me();
    const body = errorResponseSchema.parse(await response.json());

    expect(response.status()).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  test('rejects an invalid access token @security', async ({ authApi }) => {
    const response = await authApi.me('not-a-valid-token');
    const body = errorResponseSchema.parse(await response.json());

    expect(response.status()).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });
});
