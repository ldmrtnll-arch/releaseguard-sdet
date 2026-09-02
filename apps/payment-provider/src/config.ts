import { z } from 'zod';

const schema = z.object({
  PAYMENT_PROVIDER_HOST: z.string().min(1).default('0.0.0.0'),
  PAYMENT_PROVIDER_PORT: z.coerce
    .number()
    .int()
    .min(1)
    .max(65_535)
    .default(4100),
  PAYMENT_SLOW_DELAY_MS: z.coerce.number().int().positive().default(100),
  PAYMENT_TIMEOUT_DELAY_MS: z.coerce.number().int().positive().default(650),
});

export function loadProviderConfig(
  environment: NodeJS.ProcessEnv = process.env,
) {
  const parsed = schema.safeParse(environment);

  if (!parsed.success) {
    throw new Error(
      `Invalid payment provider configuration: ${z.prettifyError(parsed.error)}`,
    );
  }

  return {
    host: parsed.data.PAYMENT_PROVIDER_HOST,
    port: parsed.data.PAYMENT_PROVIDER_PORT,
    slowDelayMs: parsed.data.PAYMENT_SLOW_DELAY_MS,
    timeoutDelayMs: parsed.data.PAYMENT_TIMEOUT_DELAY_MS,
  };
}
