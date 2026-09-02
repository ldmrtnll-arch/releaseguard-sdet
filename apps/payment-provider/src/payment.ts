import { randomUUID } from 'node:crypto';

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

export const authorizationInputSchema = z
  .object({
    amountCents: z.number().int().positive(),
    currency: z.literal('USD'),
    customerReference: z.string().uuid(),
  })
  .strict();

export type AuthorizationInput = z.infer<typeof authorizationInputSchema>;

export type PaymentResult = {
  amountCents: number;
  currency: 'USD';
  paymentId: string;
  status: 'approved' | 'declined';
};

export type PaymentState = {
  attempts: number;
  fingerprint: string;
  idempotencyKey: string;
  operation?: Promise<PaymentResult>;
  requestIds: string[];
  result?: PaymentResult;
  scenario: PaymentScenario;
};

function fingerprint(input: AuthorizationInput): string {
  return JSON.stringify(input);
}

function resultFor(
  input: AuthorizationInput,
  status: PaymentResult['status'],
): PaymentResult {
  return {
    amountCents: input.amountCents,
    currency: input.currency,
    paymentId: randomUUID(),
    status,
  };
}

export class PaymentStateStore {
  private readonly entries = new Map<string, PaymentState>();

  begin(
    idempotencyKey: string,
    input: AuthorizationInput,
    requestId: string,
    scenario: PaymentScenario,
  ): { conflict: boolean; state: PaymentState } {
    const inputFingerprint = fingerprint(input);
    const existing = this.entries.get(idempotencyKey);

    if (existing) {
      existing.attempts += 1;
      existing.requestIds.push(requestId);
      return {
        conflict: existing.fingerprint !== inputFingerprint,
        state: existing,
      };
    }

    const state: PaymentState = {
      attempts: 1,
      fingerprint: inputFingerprint,
      idempotencyKey,
      requestIds: [requestId],
      scenario,
    };
    this.entries.set(idempotencyKey, state);
    return { conflict: false, state };
  }

  find(idempotencyKey: string): PaymentState | undefined {
    return this.entries.get(idempotencyKey);
  }

  complete(
    state: PaymentState,
    input: AuthorizationInput,
    status: PaymentResult['status'],
  ): PaymentResult {
    const result = resultFor(input, status);
    state.result = result;
    return result;
  }
}
