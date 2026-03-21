import { type Page, expect } from '@playwright/test';

/**
 * Login via API call and inject tokens into sessionStorage.
 * Handles risk scoring 2FA challenges by retrying (second attempt
 * from the same IP won't trigger the challenge).
 */
export async function login(page: Page, attempt = 1): Promise<void> {
  const baseUrl = process.env.BASE_URL || 'https://ifmio.com';
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;
  if (!email || !password) {
    throw new Error('TEST_EMAIL and TEST_PASSWORD must be set in .env');
  }

  // Navigate to set the origin (sessionStorage is per-origin)
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  // Login via API (bypasses UI rate limiting)
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

  // Handle risk scoring 2FA challenge or rate limiting — retry
  if ((response.requires2fa || response.statusCode === 429) && attempt < 3) {
    const reason = response.requires2fa ? '2FA challenge' : 'rate limited';
    console.warn(`[E2E Login] Attempt ${attempt} — ${reason}, retrying in 3s...`);
    await new Promise(r => setTimeout(r, 3000));
    return login(page, attempt + 1);
  }

  if (response.requires2fa) {
    throw new Error(`Login blocked by risk scoring after ${attempt} attempts. IP not yet trusted.`);
  }

  if (!response.accessToken) {
    if (attempt < 3) {
      console.warn(`[E2E Login] Attempt ${attempt} failed: ${response.message}, retrying...`);
      await new Promise(r => setTimeout(r, 2000));
      return login(page, attempt + 1);
    }
    throw new Error(`Login failed after ${attempt} attempts: ${response.message || JSON.stringify(response)}`);
  }

  // Inject tokens into sessionStorage
  await page.evaluate((data) => {
    sessionStorage.setItem('ifmio:access_token', data.accessToken);
    sessionStorage.setItem('ifmio:refresh_token', data.refreshToken);
    sessionStorage.setItem('ifmio:user', JSON.stringify(data.user));
  }, response);

  // Navigate to dashboard
  await page.goto('/dashboard');
  await expect(page.locator('.sidebar__logo')).toBeVisible({ timeout: 10_000 });
}
