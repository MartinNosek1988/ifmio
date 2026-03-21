import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Správa jednotek', () => {
  test('Tab Jednotky a detail jednotky', async ({ page }) => {
    await login(page);
    await page.goto('/properties');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    const firstRow = page.locator('.tbl tbody tr').first();
    if (!(await firstRow.isVisible().catch(() => false))) {
      test.skip(true, 'Žádné nemovitosti');
      return;
    }

    await firstRow.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Switch to units tab
    await page.locator('[data-testid="property-tab-units"]').click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Should see either units table or empty state
    const hasContent = await page.locator('.tbl').isVisible().catch(() => false);
    const hasEmpty = await page.locator('[data-testid="empty-state"]').isVisible().catch(() => false);
    expect(hasContent || hasEmpty, 'Tab jednotky zobrazuje obsah').toBe(true);

    // Click into unit detail if units exist
    const unitRow = page.locator('.tbl tbody tr').first();
    if (await unitRow.isVisible().catch(() => false)) {
      await unitRow.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);
      await expect(page).toHaveURL(/\/properties\/[a-z0-9-]+\/units\/[a-z0-9-]+/);
    }
  });
});
