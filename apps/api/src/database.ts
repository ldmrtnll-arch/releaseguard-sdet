import { Pool } from 'pg';
import type { QueryResult, QueryResultRow } from 'pg';

export type Database = {
  close: () => Promise<void>;
  ping: () => Promise<void>;
  query: <Row extends QueryResultRow>(
    text: string,
    values?: unknown[],
  ) => Promise<QueryResult<Row>>;
};

export function createDatabase(connectionString: string): Database {
  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 5_000,
    max: 10,
  });

  return {
    async ping() {
      await pool.query('SELECT 1');
    },
    async close() {
      await pool.end();
    },
    async query<Row extends QueryResultRow>(text: string, values?: unknown[]) {
      return pool.query<Row>(text, values);
    },
  };
}
