import { existsSync } from 'node:fs';

import { z } from 'zod';

const environmentFile = new URL('../../../.env', import.meta.url);

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
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
});

export type AppConfig = {
  corsOrigin: string;
  databaseUrl: string;
  host: string;
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
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

  return {
    corsOrigin: parsed.data.CORS_ORIGIN,
    databaseUrl: parsed.data.DATABASE_URL,
    host: parsed.data.API_HOST,
    nodeEnv: parsed.data.NODE_ENV,
    port: parsed.data.API_PORT,
  };
}
