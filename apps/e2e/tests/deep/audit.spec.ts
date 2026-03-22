import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

// NOTE: Audit is READ ONLY — no CRUD operations

test.describe('Audit — Read Only', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('stránka se načte', async ({ page }) => {
    await page.goto('/audit');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="audit-page"]')).toBeVisible({ timeout: 15000 });
  });

  test('zobrazí záznamy bez chyby', async ({ page }) => {
    await page.goto('/audit');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    const hasError = await page.locator('text=Nepodařilo se').isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });
});
