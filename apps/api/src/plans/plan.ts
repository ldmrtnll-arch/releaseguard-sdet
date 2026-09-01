export type StoredPlan = {
  active: boolean;
  billingInterval: 'monthly';
  code: string;
  createdAt: Date;
  id: string;
  name: string;
  priceCents: number;
  updatedAt: Date;
};

export type PublicPlan = {
  billingInterval: 'monthly';
  code: string;
  id: string;
  name: string;
  priceCents: number;
};

export function toPublicPlan(plan: StoredPlan): PublicPlan {
  return {
    billingInterval: plan.billingInterval,
    code: plan.code,
    id: plan.id,
    name: plan.name,
    priceCents: plan.priceCents,
  };
}
