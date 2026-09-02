import { existsSync } from 'node:fs';

import { Verifier } from '@pact-foundation/pact';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildProvider } from '../../../apps/payment-provider/src/app';
import { pactFile } from '../contract-config';

type ContractScenario = 'approved' | 'declined' | 'server-error';

const proxyEnvironmentNames = [
  'ALL_PROXY',
  'HTTPS_PROXY',
  'HTTP_PROXY',
  'all_proxy',
  'https_proxy',
  'http_proxy',
] as const;

function configurePactEnvironment(): () => void {
  const managedEnvironmentNames = [
    ...proxyEnvironmentNames,
    'NO_PROXY',
    'PACT_DO_NOT_TRACK',
  ] as const;
  const originalEnvironment = new Map(
    managedEnvironmentNames.map((name) => [name, process.env[name]]),
  );
  const localAddresses = ['127.0.0.1', 'localhost'];
  const configured = (process.env.NO_PROXY ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  process.env.NO_PROXY = [...new Set([...localAddresses, ...configured])].join(
    ',',
  );
  process.env.PACT_DO_NOT_TRACK = 'true';

  for (const name of proxyEnvironmentNames) delete process.env[name];

  return () => {
    for (const [name, value] of originalEnvironment) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  };
}

describe('Payment Provider verification @contract', () => {
  let app: FastifyInstance | undefined;
  let providerBaseUrl = process.env.PAYMENT_PROVIDER_CONTRACT_URL;
  let restoreProxyEnvironment: (() => void) | undefined;
  let scenario: ContractScenario = 'approved';

  beforeAll(async () => {
    restoreProxyEnvironment = configurePactEnvironment();
    expect(existsSync(pactFile), `Missing generated Pact: ${pactFile}`).toBe(
      true,
    );

    if (!providerBaseUrl) {
      app = buildProvider();
      providerBaseUrl = await app.listen({ host: '127.0.0.1', port: 0 });
    }
  });

  afterAll(async () => {
    await app?.close();
    restoreProxyEnvironment?.();
  });

  it('verifies every consumer interaction against the real provider', async () => {
    if (!providerBaseUrl) throw new Error('Provider URL was not initialized');

    await new Verifier({
      logLevel: 'error',
      pactUrls: [pactFile],
      providerBaseUrl,
      requestFilter(
        request: { headers: Record<string, string | string[] | undefined> },
        _response: unknown,
        next: () => void,
      ) {
        request.headers['x-test-payment-scenario'] = scenario;
        next();
      },
      stateHandlers: {
        'payment can be approved': () => {
          scenario = 'approved';
          return Promise.resolve();
        },
        'payment will be declined': () => {
          scenario = 'declined';
          return Promise.resolve();
        },
        'provider returns an internal error': () => {
          scenario = 'server-error';
          return Promise.resolve();
        },
      },
    }).verifyProvider();
  }, 30_000);
});
