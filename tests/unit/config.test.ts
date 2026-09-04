import { describe, expect, it } from 'vitest';

import { loadConfig } from '../../apps/api/src/config';

describe('API configuration', () => {
  it('always disables payment test controls in production', () => {
    const config = loadConfig({
      ENABLE_TEST_CONTROLS: 'true',
      JWT_SECRET: 'releaseguard-production-test-secret-only',
      NODE_ENV: 'production',
    });

    expect(config.enableTestControls).toBe(false);
  });

  it('rejects the local JWT secret default in production', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(
      'JWT_SECRET must be explicitly configured in production.',
    );
  });
});
