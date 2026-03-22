import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

// NOTE: Reporting is READ ONLY — no CRUD operations

test.describe('Reporting — Read Only', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('stránka se načte', async ({ page }) => {
    await page.goto('/reporting');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="reporting-page"]')).toBeVisible({ timeout: 15000 });
  });

  test('zobrazí obsah bez chyby', async ({ page }) => {
    await page.goto('/reporting');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    const hasError = await page.locator('text=Nepodařilo se').isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });
});
