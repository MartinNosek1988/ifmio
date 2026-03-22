import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
const API_URL = process.env.API_URL || 'http://localhost:3000';
async function getToken(page: any) { return page.evaluate(() => sessionStorage.getItem('ifmio:access_token')); }

test.describe('Settlements — Deep', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('stránka se načte', async ({ page }) => {
    await page.goto('/settlements');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="settlements-page"]')).toBeVisible({ timeout: 15000 });
  });

  test('API — seznam vyúčtování', async ({ page }) => {
    const token = await getToken(page);
    const res = await page.request.get(`${API_URL}/api/v1/settlements`, { headers: { Authorization: `Bearer ${token}` } });
    expect(res.ok()).toBe(true);
  });
});
