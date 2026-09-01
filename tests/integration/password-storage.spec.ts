import { expect, test } from '../support/fixtures';

test.describe('Password persistence @integration @security', () => {
  test('stores a salted bcrypt hash instead of the plaintext password', async ({
    authApi,
    database,
    userBuilder,
  }) => {
    const data = userBuilder();
    expect((await authApi.register(data)).status()).toBe(201);

    const stored = await database.findPasswordByEmail(data.email);

    expect(stored).toBeDefined();
    expect(stored?.passwordHash).not.toBe(data.password);
    expect(stored?.passwordHash).toMatch(/^\$2[aby]\$12\$/);
  });
});
