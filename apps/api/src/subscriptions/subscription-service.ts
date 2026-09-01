import { randomUUID } from 'node:crypto';

import {
  PlanNotFoundError,
  SubscriptionAlreadyActiveError,
  SubscriptionAlreadyOnPlanError,
  SubscriptionNotFoundError,
} from '../errors.js';
import type { PlanRepository } from '../plans/plan-repository.js';
import type { PublicSubscription } from './subscription.js';
import { toPublicSubscription } from './subscription.js';
import type { SubscriptionRepository } from './subscription-repository.js';

export type SubscriptionService = {
  cancelCurrent: (userId: string) => Promise<PublicSubscription>;
  changeCurrentPlan: (
    userId: string,
    planId: string,
  ) => Promise<PublicSubscription>;
  create: (userId: string, planId: string) => Promise<PublicSubscription>;
  findCurrent: (userId: string) => Promise<PublicSubscription>;
};

export function createSubscriptionService(
  subscriptions: SubscriptionRepository,
  plans: PlanRepository,
): SubscriptionService {
  async function requirePlan(planId: string) {
    const plan = await plans.findActiveById(planId);

    if (!plan) {
      throw new PlanNotFoundError();
    }

    return plan;
  }

  return {
    async create(userId, planId) {
      await requirePlan(planId);

      if (await subscriptions.findCurrentByUser(userId)) {
        throw new SubscriptionAlreadyActiveError();
      }

      return toPublicSubscription(
        await subscriptions.createActive({ id: randomUUID(), planId, userId }),
      );
    },

    async findCurrent(userId) {
      const subscription = await subscriptions.findCurrentByUser(userId);

      if (!subscription) {
        throw new SubscriptionNotFoundError();
      }

      return toPublicSubscription(subscription);
    },

    async changeCurrentPlan(userId, planId) {
      await requirePlan(planId);
      const current = await subscriptions.findCurrentByUser(userId);

      if (!current) {
        throw new SubscriptionNotFoundError();
      }

      if (current.planId === planId) {
        throw new SubscriptionAlreadyOnPlanError();
      }

      const changed = await subscriptions.changeCurrentPlan(userId, planId);

      if (!changed) {
        throw new SubscriptionNotFoundError();
      }

      return toPublicSubscription(changed);
    },

    async cancelCurrent(userId) {
      const cancelled = await subscriptions.cancelCurrent(userId);

      if (!cancelled) {
        throw new SubscriptionNotFoundError();
      }

      return toPublicSubscription(cancelled);
    },
  };
}
