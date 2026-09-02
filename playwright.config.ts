import { defineConfig, devices } from '@playwright/test';

const isCi = Boolean(process.env.CI);
process.env.TEST_RUN_ID ??= `pw-${Date.now().toString(36)}-${process.pid}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  workers: isCi ? 2 : 4,
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
      name: 'payment-provider',
      testDir: './tests/provider',
      use: { baseURL: 'http://localhost:4100' },
    },
    {
      name: 'api',
      testDir: './tests/api',
      use: { baseURL: 'http://localhost:4000' },
    },
    {
      name: 'ui-chromium',
      testDir: './tests/ui',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:5173',
      },
    },
    {
      name: 'ui-firefox-smoke',
      testDir: './tests/ui',
      grep: /@smoke/,
      use: {
        ...devices['Desktop Firefox'],
        baseURL: 'http://localhost:5173',
      },
    },
    {
      name: 'ui-webkit-smoke',
      testDir: './tests/ui',
      grep: /@smoke/,
      use: {
        ...devices['Desktop Safari'],
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
      command: 'node --import tsx apps/payment-provider/src/server.ts',
      reuseExistingServer: !isCi,
      stderr: 'pipe',
      stdout: 'pipe',
      timeout: 30_000,
      url: 'http://localhost:4100/health',
    },
    {
      command: 'node --import tsx apps/api/src/server.ts',
      env: {
        ENABLE_TEST_CONTROLS: 'true',
        PAYMENT_PROVIDER_URL: 'http://localhost:4100',
      },
      reuseExistingServer: !isCi,
      stderr: 'pipe',
      stdout: 'pipe',
      timeout: 30_000,
      url: 'http://localhost:4000/health',
    },
    {
      command: 'node node_modules/vite/bin/vite.js apps/web --host 0.0.0.0',
      reuseExistingServer: !isCi,
      stderr: 'pipe',
      stdout: 'pipe',
      timeout: 30_000,
      url: 'http://localhost:5173',
    },
  ],
});
