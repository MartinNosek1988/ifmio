import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Property CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('properties list page renders', async ({ page }) => {
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');
    // Should see either a table or empty state
    const hasContent = await page.locator('.tbl').isVisible().catch(() => false);
    const hasEmpty = await page.locator('[data-testid="empty-state"]').isVisible().catch(() => false);
    expect(hasContent || hasEmpty).toBe(true);
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
    await expect(page).toHaveURL(/\/properties\/[a-z0-9-]+/);
  });

  test('property detail tabs are visible', async ({ page }) => {
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');

    const firstRow = page.locator('.tbl tbody tr').first();
    if (!(await firstRow.isVisible().catch(() => false))) {
      test.skip(true, 'No properties exist');
      return;
    }

    await firstRow.click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="property-tab-overview"]')).toBeVisible();
    await expect(page.locator('[data-testid="property-tab-units"]')).toBeVisible();
    await expect(page.locator('[data-testid="property-tab-owners"]')).toBeVisible();
  });
});
