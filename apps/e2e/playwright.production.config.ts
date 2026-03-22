import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Playwright config for visual smoke tests against the production environment.
 * No globalSetup / globalTeardown — production has real data; no seeding or cleanup.
 * Screenshots are captured for every test so every run produces visual evidence.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: 1,
  workers: 1,
  use: {
    baseURL: process.env.BASE_URL || 'https://ifmio.com',
    screenshot: 'on',
    trace: 'on-first-retry',
    locale: 'cs-CZ',
    video: 'off',
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
      testMatch: /smoke\/visual-production\.spec\.ts/,
    },
  ],
  outputDir: './test-results/production',
  reporter: [
    ['html', { outputFolder: 'playwright-report-production', open: 'never' }],
    ['json', { outputFile: 'production-test-results.json' }],
    ['list'],
  ],
});
