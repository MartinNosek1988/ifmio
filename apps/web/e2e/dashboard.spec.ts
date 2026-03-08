import { test, expect } from '@playwright/test';
import { loginViaApi, navigateTo } from './helpers';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page);
  });

  test('loads dashboard page', async ({ page }) => {
    await navigateTo(page, '/dashboard');
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('shows KPI cards', async ({ page }) => {
    await navigateTo(page, '/dashboard');
    // Dashboard should have at least some KPI cards visible
    const cards = page.locator('[class*="kpi"], [class*="card"]');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
  });

  test('sidebar navigation works', async ({ page }) => {
    await navigateTo(page, '/dashboard');
    await page.click('a[href="/properties"]');
    await expect(page).toHaveURL(/properties/);
    await expect(page.locator('text=Nemovitosti')).toBeVisible();
  });
});
