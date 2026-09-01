import cors from '@fastify/cors';
import Fastify from 'fastify';

import type { AppConfig } from './config.js';
import type { Database } from './database.js';
import { healthRoutes } from './routes/health.js';

type BuildAppOptions = {
  config: AppConfig;
  database: Database;
};

export async function buildApp({ config, database }: BuildAppOptions) {
  const app = Fastify({
    logger: config.nodeEnv !== 'test',
    requestIdHeader: 'x-request-id',
  });

  await app.register(cors, {
    origin: config.corsOrigin,
  });
  await app.register(healthRoutes, { database });

  app.addHook('onClose', async () => {
    await database.close();
  });

  return app;
}
