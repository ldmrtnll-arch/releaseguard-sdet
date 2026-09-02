import { describe, expect, it } from 'vitest';

import { loadConfig } from '../../apps/api/src/config';

describe('API configuration', () => {
  it('always disables payment test controls in production', () => {
    const config = loadConfig({
      ENABLE_TEST_CONTROLS: 'true',
      NODE_ENV: 'production',
    });

    expect(config.enableTestControls).toBe(false);
  });
});
