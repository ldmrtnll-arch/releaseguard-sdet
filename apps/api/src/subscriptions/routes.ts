import type { FastifyPluginCallback, FastifyRequest } from 'fastify';

import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import { AppError, UnauthorizedError } from '../errors.js';
import {
  paymentScenarios,
  type PaymentScenario,
} from '../payments/payment-provider-client.js';
import { subscriptionInputSchema } from './schemas.js';
import type { SubscriptionService } from './subscription-service.js';

type SubscriptionRoutesOptions = {
  enableTestControls: boolean;
  subscriptions: SubscriptionService;
};

const idempotencyKeySchema = z.string().min(8).max(128);
const paymentScenarioSchema = z.enum(paymentScenarios);

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

function paymentContext(
  request: FastifyRequest,
  enableTestControls: boolean,
): {
  idempotencyKey: string;
  requestId: string;
  scenario?: PaymentScenario;
} {
  const providedKey = request.headers['idempotency-key'];
  const key = providedKey
    ? idempotencyKeySchema.safeParse(providedKey)
    : { success: true as const, data: randomUUID() };

  if (!key.success) {
    throw new AppError('VALIDATION_ERROR', 'Idempotency key is invalid', 400);
  }

  const requestedScenario = request.headers['x-test-payment-scenario'];
  let scenario: PaymentScenario | undefined;

  if (enableTestControls && requestedScenario) {
    const parsedScenario = paymentScenarioSchema.safeParse(requestedScenario);

    if (!parsedScenario.success) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Payment scenario is invalid',
        400,
      );
    }

    scenario = parsedScenario.data;
  }

  return { idempotencyKey: key.data, requestId: request.id, scenario };
}

export const subscriptionRoutes: FastifyPluginCallback<
  SubscriptionRoutesOptions
> = (app, { enableTestControls, subscriptions }, done) => {
  app.post('/api/v1/subscriptions', async (request, reply) => {
    const userId = await authenticatedUserId(request);
    const input = parseInput(request.body);
    const subscription = await subscriptions.create(
      userId,
      input.planId,
      paymentContext(request, enableTestControls),
    );

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
