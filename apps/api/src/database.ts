import { Pool } from 'pg';

export type Database = {
  close: () => Promise<void>;
  ping: () => Promise<void>;
};

export function createDatabase(connectionString: string): Database {
  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 2_000,
    max: 5,
  });

  return {
    async ping() {
      await pool.query('SELECT 1');
    },
    async close() {
      await pool.end();
    },
  };
}
