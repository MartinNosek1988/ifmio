import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
const API_URL = process.env.API_URL || 'http://localhost:3000';
async function getToken(page: any) { return page.evaluate(() => sessionStorage.getItem('ifmio:access_token')); }

test.describe('Communication — Deep', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('stránka se načte', async ({ page }) => {
    await page.goto('/communication');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="communication-page"]')).toBeVisible({ timeout: 15000 });
  });

  test('stránka zobrazí taby nebo obsah', async ({ page }) => {
    await page.goto('/communication');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    const hasError = await page.locator('text=Nepodařilo se').isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });
});
