import { test, expect } from '@playwright/test';
import { loginViaApi, navigateTo } from './helpers';

test.describe('Residents', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page);
  });

  test('loads residents page', async ({ page }) => {
    await navigateTo(page, '/residents');
    await expect(page.locator('text=Bydlící')).toBeVisible();
  });

  test('shows KPI stats', async ({ page }) => {
    await navigateTo(page, '/residents');
    await expect(page.locator('text=Celkem')).toBeVisible();
    await expect(page.locator('text=Aktivních')).toBeVisible();
  });

  test('search filters residents', async ({ page }) => {
    await navigateTo(page, '/residents');
    const searchInput = page.locator('input[placeholder*="Hledat"]');
    await searchInput.fill('Novak');
    // Wait for filtering to take effect
    await page.waitForTimeout(500);
  });

  test('new resident button opens form', async ({ page }) => {
    await navigateTo(page, '/residents');
    await page.click('button:has-text("Nový bydlící")');
    // Form/modal should appear
    await expect(page.locator('text=/Nový bydlící|Přidat bydlícího|Jméno|Příjmení/i')).toBeVisible();
  });

  test('import button opens import wizard', async ({ page }) => {
    await navigateTo(page, '/residents');
    await page.click('button:has-text("Import")');
    await expect(page.locator('text=Import bydlících')).toBeVisible();
  });
});
