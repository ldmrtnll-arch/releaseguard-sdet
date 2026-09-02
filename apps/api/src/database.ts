import { Pool } from 'pg';
import type { QueryResult, QueryResultRow } from 'pg';

export type QueryExecutor = {
  query: <Row extends QueryResultRow>(
    text: string,
    values?: unknown[],
  ) => Promise<QueryResult<Row>>;
};

export type Database = QueryExecutor & {
  close: () => Promise<void>;
  ping: () => Promise<void>;
  transaction: <Result>(
    operation: (transaction: QueryExecutor) => Promise<Result>,
  ) => Promise<Result>;
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
    async transaction<Result>(
      operation: (transaction: QueryExecutor) => Promise<Result>,
    ) {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');
        const result = await operation({
          query: (text, values) => client.query(text, values),
        });
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
