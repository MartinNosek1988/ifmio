import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Property CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('properties list page renders with table', async ({ page }) => {
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');
    // Should see the page title
    await expect(page.locator('.topbar__title')).toContainText('Nemovitosti');
    // Should see a table or empty state
    const hasTable = await page.locator('.tbl').isVisible().catch(() => false);
    const hasEmpty = await page.locator('.empty-state').isVisible().catch(() => false);
    expect(hasTable || hasEmpty).toBe(true);
  });

  test('property detail page renders when clicking first property', async ({ page }) => {
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');

    const firstRow = page.locator('.tbl tbody tr').first();
    const rowExists = await firstRow.isVisible().catch(() => false);
    if (!rowExists) {
      test.skip(true, 'No properties exist — skipping detail test');
      return;
    }

    await firstRow.click();
    await page.waitForLoadState('networkidle');
    // Should navigate to property detail
    await expect(page).toHaveURL(/\/properties\/[a-z0-9-]+/);
    // Should see tab navigation
    await expect(page.locator('.topbar__title')).toContainText('Detail nemovitosti');
  });
});
