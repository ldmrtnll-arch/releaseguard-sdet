import { Pool } from 'pg';

const defaultDatabaseUrl =
  'postgresql://releaseguard:releaseguard_dev@localhost:5433/releaseguard';

export type StoredPassword = {
  email: string;
  passwordHash: string;
};

export type StoredSubscription = {
  cancelledAt: Date | null;
  id: string;
  planId: string;
  status: 'active' | 'cancelled';
  userId: string;
};

export class TestDatabase {
  private readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL ?? defaultDatabaseUrl,
    max: 2,
  });

  async findPasswordByEmail(
    email: string,
  ): Promise<StoredPassword | undefined> {
    const result = await this.pool.query<StoredPassword>(
      `SELECT email, password_hash AS "passwordHash"
       FROM users
       WHERE email = $1`,
      [email],
    );

    return result.rows[0];
  }

  async countPlans(): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM plans',
    );

    return Number(result.rows[0]?.count ?? 0);
  }

  async listPlanCodes(): Promise<string[]> {
    const result = await this.pool.query<{ code: string }>(
      'SELECT code FROM plans ORDER BY price_cents ASC, code ASC',
    );

    return result.rows.map(({ code }) => code);
  }

  async countActiveSubscriptions(userId: string): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM subscriptions
       WHERE user_id = $1 AND status = 'active'`,
      [userId],
    );

    return Number(result.rows[0]?.count ?? 0);
  }

  async findSubscriptionsByUser(userId: string): Promise<StoredSubscription[]> {
    const result = await this.pool.query<StoredSubscription>(
      `SELECT
         id,
         user_id AS "userId",
         plan_id AS "planId",
         status,
         cancelled_at AS "cancelledAt"
       FROM subscriptions
       WHERE user_id = $1
       ORDER BY created_at ASC`,
      [userId],
    );

    return result.rows;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
