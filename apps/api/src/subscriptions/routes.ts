import type { FastifyPluginCallback, FastifyRequest } from 'fastify';

import { AppError, UnauthorizedError } from '../errors.js';
import { subscriptionInputSchema } from './schemas.js';
import type { SubscriptionService } from './subscription-service.js';

type SubscriptionRoutesOptions = {
  subscriptions: SubscriptionService;
};

async function authenticatedUserId(request: FastifyRequest): Promise<string> {
  try {
    await request.jwtVerify();
  } catch {
    throw new UnauthorizedError();
  }

  return request.user.sub;
}

function parseInput(body: unknown): { planId: string } {
  const parsed = subscriptionInputSchema.safeParse(body);

  if (!parsed.success) {
    throw new AppError('VALIDATION_ERROR', 'Request payload is invalid', 400);
  }

  return parsed.data;
}

export const subscriptionRoutes: FastifyPluginCallback<
  SubscriptionRoutesOptions
> = (app, { subscriptions }, done) => {
  app.post('/api/v1/subscriptions', async (request, reply) => {
    const userId = await authenticatedUserId(request);
    const input = parseInput(request.body);
    const subscription = await subscriptions.create(userId, input.planId);

    return reply.code(201).send({ data: subscription });
  });

  app.get('/api/v1/subscriptions/current', async (request) => {
    const userId = await authenticatedUserId(request);
    return { data: await subscriptions.findCurrent(userId) };
  });

  app.patch('/api/v1/subscriptions/current', async (request) => {
    const userId = await authenticatedUserId(request);
    const input = parseInput(request.body);
    return {
      data: await subscriptions.changeCurrentPlan(userId, input.planId),
    };
  });

  app.delete('/api/v1/subscriptions/current', async (request) => {
    const userId = await authenticatedUserId(request);
    return { data: await subscriptions.cancelCurrent(userId) };
  });

  done();
};
