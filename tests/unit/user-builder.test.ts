import { describe, expect, it } from 'vitest';

import { createUserBuilder } from '@releaseguard/test-data';

describe('user test data builder', () => {
  it('creates unique and diagnosable users within a worker', () => {
    const buildUser = createUserBuilder({ runId: 'run-42', workerIndex: 3 });

    const first = buildUser();
    const second = buildUser();

    expect(first.email).toBe('test.user.run-42.3.1@releaseguard.test');
    expect(second.email).toBe('test.user.run-42.3.2@releaseguard.test');
    expect(first.email).not.toBe(second.email);
  });

  it('uses a valid artificial password and the reserved test domain', () => {
    const user = createUserBuilder({ runId: 'contract' })();

    expect(user.email).toMatch(/@releaseguard\.test$/);
    expect(user.password.length).toBeGreaterThanOrEqual(8);
  });

  it('applies overrides without requiring scenario-specific factories', () => {
    const buildUser = createUserBuilder({ runId: 'override' });

    expect(
      buildUser({ email: 'invalid-email', password: 'short' }),
    ).toMatchObject({ email: 'invalid-email', password: 'short' });
  });
});
