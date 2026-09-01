import type { FastifyPluginCallback } from 'fastify';

import type { Database } from '../database.js';

type HealthRoutesOptions = {
  database: Database;
};

export const healthRoutes: FastifyPluginCallback<HealthRoutesOptions> = (
  app,
  { database },
  done,
) => {
  app.get('/health', () => ({
    service: 'releaseguard-api',
    status: 'ok',
  }));

  app.get('/health/ready', async (_request, reply) => {
    try {
      await database.ping();

      return {
        checks: { database: 'available' },
        status: 'ready',
      };
    } catch (error) {
      app.log.error({ err: error }, 'Database readiness check failed');

      return reply.code(503).send({
        error: {
          code: 'SERVICE_NOT_READY',
          message: 'A required dependency is unavailable',
        },
        status: 'not_ready',
      });
    }
  });

  done();
};
