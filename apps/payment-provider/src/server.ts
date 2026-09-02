import { buildProvider } from './app.js';
import { loadProviderConfig } from './config.js';

const config = loadProviderConfig();
const provider = buildProvider(config);

async function shutdown(signal: string) {
  provider.log.info({ signal }, 'Payment provider shutdown requested');
  await provider.close();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

try {
  await provider.listen({ host: config.host, port: config.port });
} catch (error) {
  provider.log.error(error, 'Payment provider failed to start');
  process.exit(1);
}
