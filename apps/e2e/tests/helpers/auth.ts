import { type Page, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const AUTH_FILE = path.join(__dirname, '..', '.auth', 'tokens.json');

/**
 * Inject pre-authenticated tokens into sessionStorage.
 * Tokens are created once by auth.setup.ts — no API calls per test.
 */
export async function login(page: Page): Promise<void> {
  let tokens: { accessToken: string; refreshToken: string; user: any };

  try {
    tokens = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
  } catch {
    // Fallback: login via API if token file doesn't exist
    return loginViaApi(page);
  }

  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  await page.evaluate((data) => {
    sessionStorage.setItem('ifmio:access_token', data.accessToken);
    sessionStorage.setItem('ifmio:refresh_token', data.refreshToken);
    sessionStorage.setItem('ifmio:user', JSON.stringify(data.user));
  }, tokens);

  await page.goto('/dashboard');
  await expect(page.locator('.sidebar__logo')).toBeVisible({ timeout: 10_000 });
}

/**
 * Direct API login — used as fallback and by auth.spec.ts.
 */
export async function loginViaApi(page: Page, attempt = 1): Promise<void> {
  const apiUrl = process.env.API_URL || process.env.BASE_URL || 'https://ifmio.com';
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;
  if (!email || !password) throw new Error('TEST_EMAIL and TEST_PASSWORD must be set in .env');

  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  const response = await page.evaluate(
    async ({ url, email, password }) => {
      const res = await fetch(`${url}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      return res.json();
    },
    { url: apiUrl, email, password },
  );

  if ((response.requires2fa || response.statusCode === 429) && attempt < 3) {
    await new Promise(r => setTimeout(r, 3000));
    return loginViaApi(page, attempt + 1);
  }

  if (!response.accessToken) {
    if (attempt < 3) {
      await new Promise(r => setTimeout(r, 2000));
      return loginViaApi(page, attempt + 1);
    }
    throw new Error(`Login failed after ${attempt} attempts: ${response.message || JSON.stringify(response)}`);
  }

  await page.evaluate((data) => {
    sessionStorage.setItem('ifmio:access_token', data.accessToken);
    sessionStorage.setItem('ifmio:refresh_token', data.refreshToken);
    sessionStorage.setItem('ifmio:user', JSON.stringify(data.user));
  }, response);

  await page.goto('/dashboard');
  await expect(page.locator('.sidebar__logo')).toBeVisible({ timeout: 10_000 });
}
