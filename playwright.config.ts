import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/specs',
  maxFailures: 0,
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  },
  webServer: {
    command: 'npm run test:server',
    url: 'http://127.0.0.1:3100/health',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});