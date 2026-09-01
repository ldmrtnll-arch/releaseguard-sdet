import { Pool } from 'pg';

const defaultDatabaseUrl =
  'postgresql://releaseguard:releaseguard_dev@localhost:5433/releaseguard';

export type StoredPassword = {
  email: string;
  passwordHash: string;
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

  async close(): Promise<void> {
    await this.pool.end();
  }
}
