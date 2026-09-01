import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { createDatabase } from './database.js';

async function startServer() {
  const config = loadConfig();
  const database = createDatabase(config.databaseUrl);
  const app = await buildApp({ config, database });

  const shutdown = async (signal: NodeJS.Signals) => {
    app.log.info({ signal }, 'Shutting down API');
    await app.close();
    process.exit(0);
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));

  try {
    await app.listen({ host: config.host, port: config.port });
  } catch (error) {
    app.log.error(error);
    await app.close();
    process.exit(1);
  }
}

void startServer();
