import { randomUUID } from 'node:crypto';

import {
  PaymentDeclinedError,
  PaymentProviderTimeoutAppError,
  PaymentProviderUnavailableAppError,
  PlanNotFoundError,
  SubscriptionAlreadyActiveError,
  SubscriptionAlreadyOnPlanError,
  SubscriptionNotFoundError,
} from '../errors.js';
import type { Database } from '../database.js';
import type { PaymentRepository } from '../payments/payment-repository.js';
import {
  PaymentProviderTimeoutError,
  PaymentProviderUnavailableError,
  type PaymentProviderClient,
  type PaymentScenario,
} from '../payments/payment-provider-client.js';
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
  create: (
    userId: string,
    planId: string,
    context: {
      idempotencyKey: string;
      requestId: string;
      scenario?: PaymentScenario;
    },
  ) => Promise<PublicSubscription>;
  findCurrent: (userId: string) => Promise<PublicSubscription>;
};

export function createSubscriptionService(
  database: Database,
  subscriptions: SubscriptionRepository,
  plans: PlanRepository,
  payments: PaymentRepository,
  paymentProvider: PaymentProviderClient,
): SubscriptionService {
  async function requirePlan(planId: string) {
    const plan = await plans.findActiveById(planId);

    if (!plan) {
      throw new PlanNotFoundError();
    }

    return plan;
  }

  return {
    async create(userId, planId, context) {
      const plan = await requirePlan(planId);

      return database.transaction(async (transaction) => {
        await subscriptions.lockCreationForUser(userId, transaction);

        if (await subscriptions.findCurrentByUser(userId, transaction)) {
          throw new SubscriptionAlreadyActiveError();
        }

        let authorization;

        try {
          authorization = await paymentProvider.authorize({
            amountCents: plan.priceCents,
            currency: 'USD',
            customerReference: userId,
            idempotencyKey: context.idempotencyKey,
            requestId: context.requestId,
            scenario: context.scenario,
          });
        } catch (error) {
          if (error instanceof PaymentProviderTimeoutError) {
            throw new PaymentProviderTimeoutAppError();
          }

          if (error instanceof PaymentProviderUnavailableError) {
            throw new PaymentProviderUnavailableAppError();
          }

          throw error;
        }

        if (authorization.status === 'declined') {
          throw new PaymentDeclinedError();
        }

        const subscriptionId = randomUUID();
        const subscription = await subscriptions.createActive(
          { id: subscriptionId, planId, userId },
          transaction,
        );
        await payments.createApproved(
          {
            amountCents: plan.priceCents,
            currency: 'USD',
            id: randomUUID(),
            idempotencyKey: context.idempotencyKey,
            providerPaymentId: authorization.paymentId,
            subscriptionId,
            userId,
          },
          transaction,
        );

        return toPublicSubscription(subscription);
      });
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
