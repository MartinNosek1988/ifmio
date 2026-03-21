import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Správa jednotek', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Tab Jednotky na detailu nemovitosti zobrazí seznam', async ({ page }) => {
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');

    const firstRow = page.locator('.tbl tbody tr').first();
    if (!(await firstRow.isVisible().catch(() => false))) {
      test.skip(true, 'Žádné nemovitosti');
      return;
    }

    await firstRow.click();
    await page.waitForLoadState('networkidle');

    // Switch to units tab
    await page.locator('[data-testid="property-tab-units"]').click();
    await page.waitForLoadState('networkidle');

    // Should see either units table or empty state
    const hasContent = await page.locator('.tbl').isVisible().catch(() => false);
    const hasEmpty = await page.locator('[data-testid="empty-state"]').isVisible().catch(() => false);
    expect(hasContent || hasEmpty, 'Tab jednotky zobrazuje obsah').toBe(true);
  });

  test('Detail jednotky se načte po kliknutí', async ({ page }) => {
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

    const unitRow = page.locator('.tbl tbody tr').first();
    if (!(await unitRow.isVisible().catch(() => false))) {
      test.skip(true, 'Žádné jednotky');
      return;
    }

    await unitRow.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/properties\/[a-z0-9-]+\/units\/[a-z0-9-]+/);
  });
});
