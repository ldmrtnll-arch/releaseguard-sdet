import { describe, expect, it } from 'vitest';

import {
  PaymentProviderTimeoutError,
  PaymentProviderUnavailableError,
  shouldRetryPaymentError,
} from '../../apps/api/src/payments/payment-provider-client';

describe('payment retry policy', () => {
  it('retries provider unavailability', () => {
    expect(shouldRetryPaymentError(new PaymentProviderUnavailableError())).toBe(
      true,
    );
  });

  it('retries provider timeouts', () => {
    expect(shouldRetryPaymentError(new PaymentProviderTimeoutError())).toBe(
      true,
    );
  });

  it('does not retry business or validation failures', () => {
    expect(shouldRetryPaymentError(new Error('declined'))).toBe(false);
  });
});
