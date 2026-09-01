import { defineConfig, devices } from '@playwright/test';

const isCi = Boolean(process.env.CI);
process.env.TEST_RUN_ID ??= `pw-${Date.now().toString(36)}-${process.pid}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  workers: isCi ? 2 : undefined,
  reporter: isCi
    ? [['line'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'api',
      testDir: './tests/api',
      use: { baseURL: 'http://localhost:4000' },
    },
    {
      name: 'ui',
      testDir: './tests/ui',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:5173',
      },
    },
    {
      name: 'integration',
      testDir: './tests/integration',
      use: { baseURL: 'http://localhost:4000' },
    },
  ],
  webServer: [
    {
      command: 'npm run dev:api',
      reuseExistingServer: !isCi,
      stderr: 'pipe',
      stdout: 'pipe',
      timeout: 30_000,
      url: 'http://localhost:4000/health',
    },
    {
      command: 'npm run dev:web',
      reuseExistingServer: !isCi,
      stderr: 'pipe',
      stdout: 'pipe',
      timeout: 30_000,
      url: 'http://localhost:5173',
    },
  ],
});
