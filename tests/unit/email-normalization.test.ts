import { describe, expect, it } from 'vitest';

import { normalizeEmail } from '../../apps/api/src/auth/user';

describe('email normalization', () => {
  it('trims external whitespace and normalizes casing', () => {
    expect(normalizeEmail('  User.Name@Example.COM ')).toBe(
      'user.name@example.com',
    );
  });
});
