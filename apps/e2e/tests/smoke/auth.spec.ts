import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Autentizace', () => {
  test('Login stránka zobrazuje formulář', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="login-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-password"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-submit"]')).toBeVisible();
  });

  test('Přihlášení s platnými údaji přesměruje na dashboard', async ({ page }) => {
    await login(page);
    await expect(page.locator('.sidebar__logo')).toBeVisible();
    await expect(page).toHaveURL(/\/(dashboard|portal)/);
  });

  test('Nepřihlášený uživatel nemůže zobrazit dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
