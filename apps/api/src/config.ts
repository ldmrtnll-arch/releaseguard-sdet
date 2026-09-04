import { existsSync } from 'node:fs';

import { z } from 'zod';

const environmentFile = new URL('../../../.env', import.meta.url);
const localJwtSecret = 'releaseguard-local-only-secret-change-me';

if (existsSync(environmentFile)) {
  process.loadEnvFile(environmentFile);
}

const environmentSchema = z.object({
  API_HOST: z.string().min(1).default('0.0.0.0'),
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  CORS_ORIGIN: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z
    .string()
    .url()
    .default(
      'postgresql://releaseguard:releaseguard_dev@localhost:5433/releaseguard',
    ),
  JWT_EXPIRES_IN: z.string().min(1).default('1h'),
  JWT_SECRET: z.string().min(32).default(localJwtSecret),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  ENABLE_TEST_CONTROLS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  PAYMENT_PROVIDER_MAX_ATTEMPTS: z.coerce
    .number()
    .int()
    .min(1)
    .max(3)
    .default(2),
  PAYMENT_PROVIDER_TIMEOUT_MS: z.coerce.number().int().positive().default(250),
  PAYMENT_PROVIDER_URL: z.string().url().default('http://localhost:4100'),
});

export type AppConfig = {
  corsOrigin: string;
  databaseUrl: string;
  host: string;
  jwtExpiresIn: string;
  jwtSecret: string;
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  enableTestControls: boolean;
  paymentProviderMaxAttempts: number;
  paymentProviderTimeoutMs: number;
  paymentProviderUrl: string;
};

export function loadConfig(
  environment: NodeJS.ProcessEnv = process.env,
): AppConfig {
  const parsed = environmentSchema.safeParse(environment);

  if (!parsed.success) {
    throw new Error(
      `Invalid environment configuration: ${z.prettifyError(parsed.error)}`,
    );
  }

  if (
    parsed.data.NODE_ENV === 'production' &&
    parsed.data.JWT_SECRET === localJwtSecret
  ) {
    throw new Error('JWT_SECRET must be explicitly configured in production.');
  }

  return {
    corsOrigin: parsed.data.CORS_ORIGIN,
    databaseUrl: parsed.data.DATABASE_URL,
    host: parsed.data.API_HOST,
    jwtExpiresIn: parsed.data.JWT_EXPIRES_IN,
    jwtSecret: parsed.data.JWT_SECRET,
    nodeEnv: parsed.data.NODE_ENV,
    port: parsed.data.API_PORT,
    enableTestControls:
      parsed.data.ENABLE_TEST_CONTROLS && parsed.data.NODE_ENV !== 'production',
    paymentProviderMaxAttempts: parsed.data.PAYMENT_PROVIDER_MAX_ATTEMPTS,
    paymentProviderTimeoutMs: parsed.data.PAYMENT_PROVIDER_TIMEOUT_MS,
    paymentProviderUrl: parsed.data.PAYMENT_PROVIDER_URL,
  };
}
