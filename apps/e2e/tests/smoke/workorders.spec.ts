import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Pracovní úkoly', () => {
  test('Seznam WO se načte s tlačítkem Nový úkol', async ({ page }) => {
    await login(page);
    await page.goto('/workorders');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    const hasTable = await page.locator('[data-testid="wo-list"], .tbl').first().isVisible().catch(() => false);
    const hasEmpty = await page.locator('[data-testid="empty-state"]').isVisible().catch(() => false);
    expect(hasTable || hasEmpty, 'WO stránka zobrazuje obsah').toBe(true);
    await expect(page.locator('[data-testid="wo-add-btn"], button:has-text("Nový úkol")').first()).toBeVisible();
  });
});
