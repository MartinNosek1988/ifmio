import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  globalTimeout: 25 * 60 * 1000,
  retries: 1,
  workers: process.env.CI ? 2 : 1,
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  use: {
    baseURL: process.env.BASE_URL || 'https://ifmio.com',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    locale: 'cs-CZ',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } },
      dependencies: ['setup'],
      testMatch: /(?:smoke|deep)\/.+\.spec\.ts/,
    },
  ],
});
