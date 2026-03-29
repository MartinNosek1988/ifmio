import { test, expect } from '@playwright/test';

const API = process.env.API_URL || process.env.BASE_URL || 'https://ifmio.com';

test.describe('Security', () => {

  test('chráněné endpointy vyžadují auth token', async ({ request }) => {
    const endpoints = [
      '/api/v1/properties',
      '/api/v1/finance/invoices',
      '/api/v1/helpdesk',
      '/api/v1/work-orders',
    ];
    for (const ep of endpoints) {
      const res = await request.get(`${API}${ep}`);
      expect(res.status(), `${ep} bez tokenu`).toBe(401);
    }
  });

  test('neexistující portal token vrátí 401 nebo 404', async ({ request }) => {
    const res = await request.get(
      `${API}/api/v1/portal-public/nonexistent-token-12345/dashboard`,
    );
    expect([401, 403, 404]).toContain(res.status());
  });

  test('přístup k cizí property vrátí 404', async ({ page }) => {
    const { getFreshToken } = await import('../helpers/fresh-auth');
    const token = await getFreshToken(page);
    const res = await page.request.get(
      `${API}/api/v1/properties/clzfake000000000000000000`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect([403, 404]).toContain(res.status());
  });
});
