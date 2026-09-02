import { z } from 'zod';

export const paymentScenarios = [
  'approved',
  'declined',
  'server-error',
  'transient-error',
  'slow',
  'timeout',
] as const;

export type PaymentScenario = (typeof paymentScenarios)[number];

type AuthorizationInput = {
  amountCents: number;
  currency: 'USD';
  customerReference: string;
  idempotencyKey: string;
  requestId: string;
  scenario?: PaymentScenario;
};

export type AuthorizationResult = {
  amountCents: number;
  currency: 'USD';
  paymentId: string;
  status: 'approved' | 'declined';
};

const responseSchema = z.object({
  amountCents: z.number().int().positive(),
  currency: z.literal('USD'),
  paymentId: z.string().uuid(),
  status: z.enum(['approved', 'declined']),
});

export class PaymentProviderTimeoutError extends Error {
  constructor() {
    super('Payment provider timed out');
    this.name = 'PaymentProviderTimeoutError';
  }
}

export class PaymentProviderUnavailableError extends Error {
  constructor() {
    super('Payment provider is unavailable');
    this.name = 'PaymentProviderUnavailableError';
  }
}

export function shouldRetryPaymentError(error: unknown): boolean {
  return (
    error instanceof PaymentProviderTimeoutError ||
    error instanceof PaymentProviderUnavailableError
  );
}

export type PaymentProviderClient = {
  authorize: (input: AuthorizationInput) => Promise<AuthorizationResult>;
};

type PaymentProviderClientOptions = {
  maxAttempts: number;
  timeoutMs: number;
  url: string;
};

async function authorizeAttempt(
  options: PaymentProviderClientOptions,
  input: AuthorizationInput,
): Promise<AuthorizationResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const response = await fetch(`${options.url}/payments/authorize`, {
      body: JSON.stringify({
        amountCents: input.amountCents,
        currency: input.currency,
        customerReference: input.customerReference,
      }),
      headers: {
        'content-type': 'application/json',
        'idempotency-key': input.idempotencyKey,
        'x-request-id': input.requestId,
        ...(input.scenario
          ? { 'x-test-payment-scenario': input.scenario }
          : {}),
      },
      method: 'POST',
      signal: controller.signal,
    });

    if (response.status >= 500) throw new PaymentProviderUnavailableError();
    if (!response.ok)
      throw new Error(`Payment provider rejected request: ${response.status}`);

    return responseSchema.parse(await response.json());
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new PaymentProviderTimeoutError();
    }

    if (
      error instanceof PaymentProviderTimeoutError ||
      error instanceof PaymentProviderUnavailableError
    ) {
      throw error;
    }

    if (error instanceof TypeError) throw new PaymentProviderUnavailableError();
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function createPaymentProviderClient(
  options: PaymentProviderClientOptions,
): PaymentProviderClient {
  return {
    async authorize(input) {
      let lastError: unknown;

      for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
        try {
          return await authorizeAttempt(options, input);
        } catch (error) {
          lastError = error;

          if (
            !shouldRetryPaymentError(error) ||
            attempt === options.maxAttempts
          ) {
            throw error;
          }
        }
      }

      throw lastError;
    },
  };
}
