import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
const API_URL = process.env.API_URL || 'http://localhost:3000';
async function getToken(page: any) { return page.evaluate(() => sessionStorage.getItem('ifmio:access_token')); }

test.describe('Principals — Deep', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('stránka se načte', async ({ page }) => {
    await page.goto('/principals');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="principals-page"]')).toBeVisible({ timeout: 15000 });
  });

  test('API — seznam principálů', async ({ page }) => {
    const token = await getToken(page);
    const res = await page.request.get(`${API_URL}/api/v1/principals`, { headers: { Authorization: `Bearer ${token}` } });
    expect(res.ok()).toBe(true);
  });

  test('API — validace displayName povinný', async ({ page }) => {
    const token = await getToken(page);
    // Create party first (principal needs partyId)
    const partyRes = await page.request.post(`${API_URL}/api/v1/parties`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { type: 'company', displayName: 'Principal Test E2E' },
    });
    if (!partyRes.ok()) return;
    const party = await partyRes.json();

    // Create principal without displayName — should fail
    const res = await page.request.post(`${API_URL}/api/v1/principals`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { partyId: party.id, type: 'owner' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);

    // Cleanup party
    await page.request.delete(`${API_URL}/api/v1/parties/${party.id}`, { headers: { Authorization: `Bearer ${token}` } });
  });
});
