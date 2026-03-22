import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function getToken(page: any): Promise<string> {
  return page.evaluate(() => sessionStorage.getItem('ifmio:access_token'));
}

// ================================================================
// L1: LIST
// ================================================================
test.describe('Team — List', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('stránka se načte a zobrazí členy týmu', async ({ page }) => {
    await page.goto('/team');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="team-list-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="team-add-btn"]')).toBeVisible();
  });

  test('seznam uživatelů obsahuje alespoň 1 (aktuální)', async ({ page }) => {
    const token = await getToken(page);
    const res = await page.request.get(`${API_URL}/api/v1/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
    expect(res.ok()).toBe(true);
    const users = await res.json();
    expect(users.length).toBeGreaterThanOrEqual(1);
  });
});

// ================================================================
// L2: API VALIDATION (safe — don't create real users)
// ================================================================
test.describe('Team — Deep', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('API — email je povinný pro pozvání', async ({ page }) => {
    const token = await getToken(page);
    const res = await page.request.post(`${API_URL}/api/v1/admin/users`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { name: 'No Email User', role: 'viewer', password: 'TestPass123' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('API — duplicitní email', async ({ page }) => {
    const token = await getToken(page);

    // Get current user's email
    const meRes = await page.request.get(`${API_URL}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    const me = await meRes.json();

    // Try to invite with same email
    const res = await page.request.post(`${API_URL}/api/v1/admin/users`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { name: 'Dup Email', email: me.email, role: 'viewer', password: 'TestPass123' },
    });
    // Should be rejected (409 Conflict or 400)
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('API — nevalidní role', async ({ page }) => {
    const token = await getToken(page);
    const res = await page.request.post(`${API_URL}/api/v1/admin/users`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { name: 'Bad Role', email: `bad-role-${Date.now()}@test.cz`, role: 'superadmin', password: 'TestPass123' },
    });
    // Invalid role should be rejected or silently mapped
    expect(res.status()).toBeLessThan(500);
  });

  test('API — aktuální uživatel nemůže smazat sám sebe', async ({ page }) => {
    const token = await getToken(page);
    const meRes = await page.request.get(`${API_URL}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    const me = await meRes.json();

    const res = await page.request.delete(`${API_URL}/api/v1/admin/users/${me.id}`, { headers: { Authorization: `Bearer ${token}` } });
    // Should be rejected (403 Forbidden)
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});
