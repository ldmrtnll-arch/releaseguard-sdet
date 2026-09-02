import { describe, expect, it } from 'vitest';

import { createPaymentKeyBuilder } from '@releaseguard/test-data';

describe('payment key builder', () => {
  it('creates readable unique keys for a worker', () => {
    const buildKey = createPaymentKeyBuilder({
      runId: 'run-42',
      workerIndex: 3,
    });

    expect(buildKey()).toBe('payment.run-42.3.1');
    expect(buildKey()).toBe('payment.run-42.3.2');
  });

  it('sanitizes run identity for safe headers', () => {
    const buildKey = createPaymentKeyBuilder({
      runId: 'Feature / Payment!',
      workerIndex: 1,
    });

    expect(buildKey()).toBe('payment.feature---payment-.1.1');
  });
});
