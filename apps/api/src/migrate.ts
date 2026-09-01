import { readdir, readFile } from 'node:fs/promises';

import { Pool } from 'pg';

import { loadConfig } from './config.js';

const migrationsDirectory = new URL('../migrations/', import.meta.url);

async function migrate() {
  const config = loadConfig();
  const pool = new Pool({ connectionString: config.databaseUrl, max: 1 });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(723_114_209)');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const files = (await readdir(migrationsDirectory))
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const applied = await client.query<{ name: string }>(
        'SELECT name FROM schema_migrations WHERE name = $1',
        [file],
      );

      if (applied.rowCount !== 0) {
        continue;
      }

      const sql = await readFile(new URL(file, migrationsDirectory), 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [
        file,
      ]);
      process.stdout.write(`Applied migration ${file}\n`);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((error: unknown) => {
  process.stderr.write(
    `Migration failed: ${error instanceof Error ? error.message : 'unknown error'}\n`,
  );
  process.exitCode = 1;
});
