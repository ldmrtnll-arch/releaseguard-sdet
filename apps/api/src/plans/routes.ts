import type { FastifyPluginCallback } from 'fastify';
import { z } from 'zod';

import { AppError, PlanNotFoundError } from '../errors.js';
import type { PlanRepository } from './plan-repository.js';
import { toPublicPlan } from './plan.js';

type PlanRoutesOptions = {
  plans: PlanRepository;
};

const planParamsSchema = z.object({ id: z.string().uuid() }).strict();

export const planRoutes: FastifyPluginCallback<PlanRoutesOptions> = (
  app,
  { plans },
  done,
) => {
  app.get('/api/v1/plans', async () => ({
    data: (await plans.listActive()).map(toPublicPlan),
  }));

  app.get('/api/v1/plans/:id', async (request) => {
    const parsed = planParamsSchema.safeParse(request.params);

    if (!parsed.success) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Request parameters are invalid',
        400,
      );
    }

    const plan = await plans.findActiveById(parsed.data.id);

    if (!plan) {
      throw new PlanNotFoundError();
    }

    return { data: toPublicPlan(plan) };
  });

  done();
};
