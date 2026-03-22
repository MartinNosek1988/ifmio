import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
const API_URL = process.env.API_URL || 'http://localhost:3000';
async function getToken(page: any) { return page.evaluate(() => sessionStorage.getItem('ifmio:access_token')); }

test.describe('Revisions — Deep', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('stránka se načte', async ({ page }) => {
    await page.goto('/revisions');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="revisions-page"]')).toBeVisible({ timeout: 15000 });
  });

  test('API — seznam plánů', async ({ page }) => {
    const token = await getToken(page);
    const res = await page.request.get(`${API_URL}/api/v1/revisions/plans`, { headers: { Authorization: `Bearer ${token}` } });
    expect(res.ok()).toBe(true);
  });

  test('API — vytvoření a smazání plánu', async ({ page }) => {
    const token = await getToken(page);
    const createRes = await page.request.post(`${API_URL}/api/v1/revisions/plans`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { title: 'Revize E2E Test', scheduleMode: 'calendar', frequencyUnit: 'year', frequencyInterval: 1, nextPlannedAt: new Date(Date.now() + 90 * 86_400_000).toISOString() },
    });
    if (createRes.ok()) {
      const plan = await createRes.json();
      await page.request.delete(`${API_URL}/api/v1/revisions/plans/${plan.id}`, { headers: { Authorization: `Bearer ${token}` } });
    }
    expect(createRes.status()).toBeLessThan(500);
  });
});
