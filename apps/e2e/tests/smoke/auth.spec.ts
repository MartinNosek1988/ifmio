import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Authentication', () => {
  test('login page renders for unauthenticated user', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    // Login form should be visible
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('login with valid credentials redirects to dashboard', async ({ page }) => {
    await login(page);
    // Should see the sidebar logo after login
    await expect(page.locator('.sidebar__logo')).toBeVisible();
    // Page title should be visible in topbar
    await expect(page.locator('.topbar__title')).toBeVisible();
  });

  test('unauthenticated access to /dashboard redirects to login', async ({ page }) => {
    await page.goto('/dashboard');
    // Should be redirected to login (sessionStorage has no token → API returns 401 → app redirects)
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
