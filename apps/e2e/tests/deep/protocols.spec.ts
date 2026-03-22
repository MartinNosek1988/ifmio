import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
const API_URL = process.env.API_URL || 'http://localhost:3000';
async function getToken(page: any) { return page.evaluate(() => sessionStorage.getItem('ifmio:access_token')); }

test.describe('Protocols — Deep', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('stránka se načte', async ({ page }) => {
    await page.goto('/protocols');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="protocols-page"]')).toBeVisible({ timeout: 15000 });
  });

  test('API — seznam protokolů', async ({ page }) => {
    const token = await getToken(page);
    const res = await page.request.get(`${API_URL}/api/v1/protocols`, { headers: { Authorization: `Bearer ${token}` } });
    expect(res.ok()).toBe(true);
  });
});
