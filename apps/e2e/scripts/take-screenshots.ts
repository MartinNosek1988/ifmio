import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.BASE_URL || 'https://ifmio.com';
const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('Set TEST_EMAIL and TEST_PASSWORD in .env');
  process.exit(1);
}

const PAGES = [
  { path: '/dashboard', name: 'dashboard' },
  { path: '/properties', name: 'properties' },
  { path: '/principals', name: 'principals' },
  { path: '/parties', name: 'parties' },
  { path: '/residents', name: 'residents' },
  { path: '/finance', name: 'finance' },
  { path: '/helpdesk', name: 'helpdesk' },
  { path: '/workorders', name: 'workorders' },
  { path: '/documents', name: 'documents' },
  { path: '/meters', name: 'meters' },
  { path: '/calendar', name: 'calendar' },
  { path: '/assets', name: 'assets' },
  { path: '/kanban', name: 'kanban' },
  { path: '/settings', name: 'settings' },
  { path: '/team', name: 'team' },
  { path: '/audit', name: 'audit' },
];

async function main() {
  const outDir = path.join(__dirname, '..', 'screenshots');
  fs.mkdirSync(outDir, { recursive: true });

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'cs-CZ',
  });
  const page = await context.newPage();

  // Login via API (avoids rate limiting)
  console.log('Logging in...');
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('domcontentloaded');
  const loginResp = await page.evaluate(
    async ({ url, email, password }) => {
      const res = await fetch(`${url}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      return res.json();
    },
    { url: BASE_URL, email: EMAIL, password: PASSWORD },
  );
  if (!loginResp.accessToken) {
    console.error('Login failed:', loginResp.message || JSON.stringify(loginResp));
    process.exit(1);
  }
  await page.evaluate((data: any) => {
    sessionStorage.setItem('ifmio:access_token', data.accessToken);
    sessionStorage.setItem('ifmio:refresh_token', data.refreshToken);
    sessionStorage.setItem('ifmio:user', JSON.stringify(data.user));
  }, loginResp);
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState('networkidle');
  console.log('Login OK');

  // Screenshot each page
  for (const { path: pagePath, name } of PAGES) {
    try {
      console.log(`  Screenshotting ${name} (${pagePath})...`);
      await page.goto(`${BASE_URL}${pagePath}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500); // let animations settle
      await page.screenshot({
        path: path.join(outDir, `${ts}_${name}.png`),
        fullPage: true,
      });
    } catch (err) {
      console.error(`  FAILED: ${name} — ${(err as Error).message}`);
    }
  }

  // Also screenshot the first property detail if available
  try {
    await page.goto(`${BASE_URL}/properties`);
    await page.waitForLoadState('networkidle');
    const firstRow = page.locator('.tbl tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(outDir, `${ts}_property-detail.png`),
        fullPage: true,
      });
    }
  } catch {
    console.log('  Skipped property detail screenshot');
  }

  await browser.close();
  console.log(`\nDone! Screenshots saved to ${outDir}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
