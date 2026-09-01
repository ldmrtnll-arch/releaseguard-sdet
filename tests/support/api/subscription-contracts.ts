import { z } from 'zod';

export const planSchema = z.object({
  billingInterval: z.literal('monthly'),
  code: z.enum(['starter', 'professional', 'business']),
  id: z.string().uuid(),
  name: z.string().min(1),
  priceCents: z.number().int().nonnegative(),
});

export const planResponseSchema = z.object({ data: planSchema });

export const planListResponseSchema = z.object({ data: z.array(planSchema) });

export const subscriptionSchema = z.object({
  cancelledAt: z.string().datetime().nullable(),
  id: z.string().uuid(),
  plan: planSchema,
  startedAt: z.string().datetime(),
  status: z.enum(['active', 'cancelled']),
});

export const subscriptionResponseSchema = z.object({
  data: subscriptionSchema,
});

export type PlanResponse = z.infer<typeof planSchema>;
export type SubscriptionResponse = z.infer<typeof subscriptionSchema>;
