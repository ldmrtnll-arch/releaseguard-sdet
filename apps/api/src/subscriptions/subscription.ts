import type { PublicPlan } from '../plans/plan.js';

export type SubscriptionStatus = 'active' | 'cancelled';

export type StoredSubscription = {
  cancelledAt: Date | null;
  createdAt: Date;
  id: string;
  plan: PublicPlan;
  planId: string;
  startedAt: Date;
  status: SubscriptionStatus;
  updatedAt: Date;
  userId: string;
};

export type PublicSubscription = {
  cancelledAt: string | null;
  id: string;
  plan: PublicPlan;
  startedAt: string;
  status: SubscriptionStatus;
};

export function toPublicSubscription(
  subscription: StoredSubscription,
): PublicSubscription {
  return {
    cancelledAt: subscription.cancelledAt?.toISOString() ?? null,
    id: subscription.id,
    plan: subscription.plan,
    startedAt: subscription.startedAt.toISOString(),
    status: subscription.status,
  };
}
