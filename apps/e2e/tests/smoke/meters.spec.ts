import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Měřidla', () => {
  test('Seznam měřidel se načte s tlačítkem Nové měřidlo', async ({ page }) => {
    await login(page);
    await page.goto('/meters');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    const hasTable = await page.locator('[data-testid="meter-list"], .tbl').first().isVisible().catch(() => false);
    const hasEmpty = await page.locator('[data-testid="empty-state"]').isVisible().catch(() => false);
    expect(hasTable || hasEmpty, 'Měřidla stránka zobrazuje obsah').toBe(true);
    await expect(page.locator('[data-testid="meter-add-btn"], button:has-text("Nové měřidlo")').first()).toBeVisible();
  });
});
