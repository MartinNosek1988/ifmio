import { type Page, expect } from '@playwright/test';

/**
 * Login via API call and inject tokens into sessionStorage.
 * This avoids rate limiting on the UI login endpoint.
 */
export async function login(page: Page) {
  const baseUrl = process.env.BASE_URL || 'https://ifmio.com';
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;
  if (!email || !password) {
    throw new Error('TEST_EMAIL and TEST_PASSWORD must be set in .env');
  }

  // Navigate to any page first to set the origin (sessionStorage is per-origin)
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  // Login via API to get tokens (bypasses UI rate limiting)
  const response = await page.evaluate(
    async ({ url, email, password }) => {
      const res = await fetch(`${url}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      return res.json();
    },
    { url: baseUrl, email, password },
  );

  if (response.requires2fa) {
    throw new Error('Login requires 2FA — risk scoring challenge triggered. Retry or use a known IP.');
  }

  if (!response.accessToken) {
    throw new Error(`Login failed: ${response.message || JSON.stringify(response)}`);
  }

  // Inject tokens into sessionStorage (same as the app does on login)
  await page.evaluate((data) => {
    sessionStorage.setItem('ifmio:access_token', data.accessToken);
    sessionStorage.setItem('ifmio:refresh_token', data.refreshToken);
    sessionStorage.setItem('ifmio:user', JSON.stringify(data.user));
  }, response);

  // Navigate to dashboard — app reads tokens from sessionStorage
  await page.goto('/dashboard');
  await expect(page.locator('.sidebar__logo')).toBeVisible({ timeout: 10_000 });
}
