import { z } from 'zod';

export const subscriptionInputSchema = z
  .object({ planId: z.string().uuid() })
  .strict();
