import { expect, test } from '@playwright/test';

test.describe('API health @api @smoke', () => {
  test('returns service health when the API is available', async ({
    request,
  }) => {
    const response = await request.get('/health');

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    await expect(response.json()).resolves.toEqual({
      service: 'releaseguard-api',
      status: 'ok',
    });
  });

  test('reports readiness when PostgreSQL is available', async ({
    request,
  }) => {
    const response = await request.get('/health/ready');

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    await expect(response.json()).resolves.toEqual({
      checks: { database: 'available' },
      status: 'ready',
    });
  });
});
