import {
  errorResponseSchema,
  loginResponseSchema,
} from '../support/api/auth-contracts';
import { expect, test } from '../support/fixtures';

test.describe('User login @api @auth', () => {
  test('returns an access token for valid credentials @smoke', async ({
    authApi,
    userBuilder,
  }) => {
    const data = userBuilder();
    expect((await authApi.register(data)).status()).toBe(201);

    const response = await authApi.login(data);
    const body = loginResponseSchema.parse(await response.json());

    expect(response.status()).toBe(200);
    expect(body.accessToken.split('.')).toHaveLength(3);
    expect(body.user).toMatchObject({
      email: data.email,
      name: data.name,
    });
  });

  test('does not reveal whether an account exists during failed login @security', async ({
    authApi,
    userBuilder,
  }) => {
    const data = userBuilder();
    expect((await authApi.register(data)).status()).toBe(201);

    const wrongPassword = await authApi.login({
      email: data.email,
      password: 'IncorrectPass123!',
    });
    const unknownEmail = await authApi.login({
      email: userBuilder().email,
      password: data.password,
    });
    const wrongPasswordBody = errorResponseSchema.parse(
      await wrongPassword.json(),
    );
    const unknownEmailBody = errorResponseSchema.parse(
      await unknownEmail.json(),
    );

    expect(wrongPassword.status()).toBe(401);
    expect(unknownEmail.status()).toBe(401);
    expect(wrongPasswordBody).toEqual(unknownEmailBody);
    expect(wrongPasswordBody.error.code).toBe('INVALID_CREDENTIALS');
  });

  test('authenticates an email with different casing @regression', async ({
    authApi,
    userBuilder,
  }) => {
    const data = userBuilder();
    expect((await authApi.register(data)).status()).toBe(201);

    const response = await authApi.login({
      email: data.email.toUpperCase(),
      password: data.password,
    });

    expect(response.status()).toBe(200);
    expect(loginResponseSchema.parse(await response.json()).user.email).toBe(
      data.email,
    );
  });
});
