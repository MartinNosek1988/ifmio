import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Měřidla', () => {
  test('Seznam měřidel se načte a zobrazí tabulku nebo prázdný stav', async ({ page }) => {
    await login(page);
    await page.goto('/meters');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    const hasTable = await page.locator('[data-testid="meter-list"]').isVisible().catch(() => false);
    const hasEmpty = await page.locator('[data-testid="empty-state"]').isVisible().catch(() => false);
    expect(hasTable || hasEmpty, 'Měřidla stránka zobrazuje obsah').toBe(true);
  });

  test('Tlačítko Nové měřidlo je viditelné', async ({ page }) => {
    await login(page);
    await page.goto('/meters');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    await expect(page.locator('[data-testid="meter-add-btn"]')).toBeVisible();
  });
});
