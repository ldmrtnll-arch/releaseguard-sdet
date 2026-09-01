import type { Database } from '../database.js';
import type { StoredPlan } from './plan.js';

export type PlanRepository = {
  findActiveById: (id: string) => Promise<StoredPlan | undefined>;
  listActive: () => Promise<StoredPlan[]>;
};

const planColumns = `
  id,
  code,
  name,
  price_cents AS "priceCents",
  billing_interval AS "billingInterval",
  active,
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

export function createPlanRepository(database: Database): PlanRepository {
  return {
    async listActive() {
      const result = await database.query<StoredPlan>(
        `SELECT ${planColumns}
         FROM plans
         WHERE active = true
         ORDER BY price_cents ASC, code ASC`,
      );

      return result.rows;
    },

    async findActiveById(id) {
      const result = await database.query<StoredPlan>(
        `SELECT ${planColumns}
         FROM plans
         WHERE id = $1 AND active = true`,
        [id],
      );

      return result.rows[0];
    },
  };
}
