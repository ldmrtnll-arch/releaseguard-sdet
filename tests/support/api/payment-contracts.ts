import { z } from 'zod';

export const paymentResponseSchema = z.object({
  amountCents: z.number().int().positive(),
  currency: z.literal('USD'),
  paymentId: z.string().uuid(),
  status: z.enum(['approved', 'declined']),
});

export const paymentInspectionSchema = z.object({
  attempts: z.number().int().positive(),
  idempotencyKey: z.string(),
  logicalPayments: z.number().int().min(0).max(1),
  paymentId: z.string().uuid().nullable(),
  requestIds: z.array(z.string()),
  scenario: z.enum([
    'approved',
    'declined',
    'server-error',
    'transient-error',
    'slow',
    'timeout',
  ]),
  status: z.enum(['approved', 'declined']).nullable(),
});
