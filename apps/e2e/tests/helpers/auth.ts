import { type Page, expect } from '@playwright/test';

/**
 * Login via the UI login form.
 * Waits for redirect to /dashboard after successful login.
 */
export async function login(page: Page) {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;
  if (!email || !password) {
    throw new Error('TEST_EMAIL and TEST_PASSWORD must be set in .env');
  }

  await page.goto('/login');
  await page.getByRole('textbox', { name: /email/i }).fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /přihlásit/i }).click();

  // Wait for navigation to dashboard (login success)
  await expect(page).toHaveURL(/\/(dashboard|portal)/, { timeout: 15_000 });
}

/**
 * Login and return a reusable storageState path.
 * Use in globalSetup or test.beforeAll to avoid re-logging for every test.
 */
export async function loginAndSaveState(page: Page, statePath: string) {
  await login(page);
  await page.context().storageState({ path: statePath });
}
