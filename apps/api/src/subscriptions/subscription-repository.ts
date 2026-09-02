import { DatabaseError } from 'pg';

import type { Database, QueryExecutor } from '../database.js';
import { SubscriptionAlreadyActiveError } from '../errors.js';
import type { StoredSubscription } from './subscription.js';

export type SubscriptionRepository = {
  cancelCurrent: (userId: string) => Promise<StoredSubscription | undefined>;
  changeCurrentPlan: (
    userId: string,
    planId: string,
  ) => Promise<StoredSubscription | undefined>;
  createActive: (
    input: {
      id: string;
      planId: string;
      userId: string;
    },
    executor?: QueryExecutor,
  ) => Promise<StoredSubscription>;
  findCurrentByUser: (
    userId: string,
    executor?: QueryExecutor,
  ) => Promise<StoredSubscription | undefined>;
  lockCreationForUser: (
    userId: string,
    transaction: QueryExecutor,
  ) => Promise<void>;
};

const subscriptionColumns = `
  s.id,
  s.user_id AS "userId",
  s.plan_id AS "planId",
  s.status,
  s.started_at AS "startedAt",
  s.cancelled_at AS "cancelledAt",
  s.created_at AS "createdAt",
  s.updated_at AS "updatedAt",
  json_build_object(
    'id', p.id,
    'code', p.code,
    'name', p.name,
    'priceCents', p.price_cents,
    'billingInterval', p.billing_interval
  ) AS plan
`;

export function createSubscriptionRepository(
  database: Database,
): SubscriptionRepository {
  return {
    async findCurrentByUser(userId, executor = database) {
      const result = await executor.query<StoredSubscription>(
        `SELECT ${subscriptionColumns}
         FROM subscriptions s
         JOIN plans p ON p.id = s.plan_id
         WHERE s.user_id = $1 AND s.status = 'active'`,
        [userId],
      );

      return result.rows[0];
    },

    async createActive(input, executor = database) {
      try {
        const result = await executor.query<StoredSubscription>(
          `WITH inserted AS (
             INSERT INTO subscriptions (id, user_id, plan_id, status)
             VALUES ($1, $2, $3, 'active')
             RETURNING *
           )
           SELECT ${subscriptionColumns}
           FROM inserted s
           JOIN plans p ON p.id = s.plan_id`,
          [input.id, input.userId, input.planId],
        );
        const subscription = result.rows[0];

        if (!subscription) {
          throw new Error('Subscription insert did not return a row');
        }

        return subscription;
      } catch (error) {
        if (
          error instanceof DatabaseError &&
          error.code === '23505' &&
          error.constraint === 'subscriptions_one_active_per_user'
        ) {
          throw new SubscriptionAlreadyActiveError();
        }

        throw error;
      }
    },

    async lockCreationForUser(userId, transaction) {
      await transaction.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [userId],
      );
    },

    async changeCurrentPlan(userId, planId) {
      const result = await database.query<StoredSubscription>(
        `WITH changed AS (
           UPDATE subscriptions
           SET plan_id = $2, updated_at = now()
           WHERE user_id = $1 AND status = 'active'
           RETURNING *
         )
         SELECT ${subscriptionColumns}
         FROM changed s
         JOIN plans p ON p.id = s.plan_id`,
        [userId, planId],
      );

      return result.rows[0];
    },

    async cancelCurrent(userId) {
      const result = await database.query<StoredSubscription>(
        `WITH cancelled AS (
           UPDATE subscriptions
           SET status = 'cancelled', cancelled_at = now(), updated_at = now()
           WHERE user_id = $1 AND status = 'active'
           RETURNING *
         )
         SELECT ${subscriptionColumns}
         FROM cancelled s
         JOIN plans p ON p.id = s.plan_id`,
        [userId],
      );

      return result.rows[0];
    },
  };
}
