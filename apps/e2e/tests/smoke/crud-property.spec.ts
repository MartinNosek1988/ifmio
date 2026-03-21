import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Správa nemovitostí', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Seznam nemovitostí se zobrazí', async ({ page }) => {
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');
    const hasTable = await page.locator('[data-testid="property-list"]').isVisible().catch(() => false);
    const hasEmpty = await page.locator('[data-testid="empty-state"]').isVisible().catch(() => false);
    expect(hasTable || hasEmpty, 'Stránka zobrazuje tabulku nebo prázdný stav').toBe(true);
  });

  test('Detail nemovitosti zobrazuje taby', async ({ page }) => {
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');

    const firstRow = page.locator('.tbl tbody tr').first();
    if (!(await firstRow.isVisible().catch(() => false))) {
      test.skip(true, 'Žádné nemovitosti');
      return;
    }

    await firstRow.click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="property-tab-overview"]')).toBeVisible();
    await expect(page.locator('[data-testid="property-tab-units"]')).toBeVisible();
    await expect(page.locator('[data-testid="property-tab-owners"]')).toBeVisible();
  });

  test('Přepínání tabů na detailu nemovitosti', async ({ page }) => {
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');

    const firstRow = page.locator('.tbl tbody tr').first();
    if (!(await firstRow.isVisible().catch(() => false))) {
      test.skip(true, 'Žádné nemovitosti');
      return;
    }

    await firstRow.click();
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="property-tab-units"]').click();
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="property-tab-owners"]').click();
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="property-tab-overview"]').click();
    await page.waitForLoadState('networkidle');
  });
});
