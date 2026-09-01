import {
  errorResponseSchema,
  registerResponseSchema,
} from '../support/api/auth-contracts';
import { expect, test } from '../support/fixtures';

test.describe('User registration @api @auth', () => {
  test('registers a user with normalized email @smoke', async ({
    authApi,
    userBuilder,
  }) => {
    const generated = userBuilder();
    const data = {
      ...generated,
      email: `  ${generated.email.toUpperCase()}  `,
    };
    const response = await authApi.register(data);
    const rawBody: unknown = await response.json();
    const body = registerResponseSchema.parse(rawBody);

    expect(response.status()).toBe(201);
    expect(body.user).toMatchObject({
      email: generated.email,
      name: data.name,
    });
    expect(body.user.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(rawBody).not.toHaveProperty('user.password');
    expect(rawBody).not.toHaveProperty('user.passwordHash');
  });

  test('rejects duplicate user registration @regression', async ({
    authApi,
    userBuilder,
  }) => {
    const data = userBuilder();
    expect((await authApi.register(data)).status()).toBe(201);

    const duplicate = await authApi.register({
      ...data,
      email: data.email.toUpperCase(),
    });
    const body = errorResponseSchema.parse(await duplicate.json());

    expect(duplicate.status()).toBe(409);
    expect(body.error.code).toBe('EMAIL_ALREADY_REGISTERED');
  });

  const invalidCases = [
    {
      name: 'an invalid email',
      override: { email: 'not-an-email' },
    },
    { name: 'a short password', override: { password: 'short' } },
    { name: 'a missing name', override: { name: undefined } },
  ] as const;

  for (const invalidCase of invalidCases) {
    test(`rejects registration with ${invalidCase.name} @regression`, async ({
      authApi,
      userBuilder,
    }) => {
      const data = userBuilder();
      const response = await authApi.register({
        ...data,
        ...invalidCase.override,
      });
      const body = errorResponseSchema.parse(await response.json());

      expect(response.status()).toBe(400);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  }
});
