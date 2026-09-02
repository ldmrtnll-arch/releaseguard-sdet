import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import Fastify from 'fastify';

import { createAuthService } from './auth/auth-service.js';
import { authRoutes } from './auth/routes.js';
import { createUserRepository } from './auth/user-repository.js';
import type { AppConfig } from './config.js';
import type { Database } from './database.js';
import { AppError } from './errors.js';
import { createPlanRepository } from './plans/plan-repository.js';
import { planRoutes } from './plans/routes.js';
import { healthRoutes } from './routes/health.js';
import { subscriptionRoutes } from './subscriptions/routes.js';
import { createSubscriptionRepository } from './subscriptions/subscription-repository.js';
import { createSubscriptionService } from './subscriptions/subscription-service.js';

type BuildAppOptions = {
  config: AppConfig;
  database: Database;
};

export async function buildApp({ config, database }: BuildAppOptions) {
  const app = Fastify({
    logger:
      config.nodeEnv === 'test'
        ? false
        : {
            redact: {
              censor: '[REDACTED]',
              paths: ['req.body.password', 'req.headers.authorization'],
            },
          },
    requestIdHeader: 'x-request-id',
  });
  const authService = await createAuthService(createUserRepository(database));
  const plans = createPlanRepository(database);
  const subscriptions = createSubscriptionService(
    createSubscriptionRepository(database),
    plans,
  );

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        error: { code: error.code, message: error.message },
      });
    }

    request.log.error({ err: error }, 'Unhandled request error');

    return reply.code(500).send({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  });

  await app.register(cors, {
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    origin: config.corsOrigin,
  });
  await app.register(jwt, { secret: config.jwtSecret });
  await app.register(healthRoutes, { database });
  await app.register(authRoutes, {
    authService,
    jwtExpiresIn: config.jwtExpiresIn,
  });
  await app.register(planRoutes, { plans });
  await app.register(subscriptionRoutes, { subscriptions });

  app.addHook('onClose', async () => {
    await database.close();
  });

  return app;
}
