import { test, expect } from '@playwright/test';
import { getFreshToken } from '../helpers/fresh-auth';

const API = process.env.API_URL || process.env.BASE_URL || 'https://ifmio.com';

test.describe('Security', () => {
  test('chráněné endpointy vyžadují auth token', async ({ request }) => {
    for (const ep of ['/api/v1/properties', '/api/v1/finance/invoices', '/api/v1/helpdesk', '/api/v1/work-orders']) {
      const res = await request.get(`${API}${ep}`);
      expect(res.status(), `${ep} bez tokenu`).toBe(401);
    }
  });

  test('neexistující portal token vrátí 401, 403 nebo 404', async ({ request }) => {
    const res = await request.get(`${API}/api/v1/portal-public/nonexistent-token-12345/dashboard`);
    expect([401, 403, 404]).toContain(res.status());
  });

  test('přístup k cizí property vrátí 403 nebo 404', async ({ page }) => {
    const token = await getFreshToken(page);
    expect(token, 'getFreshToken musí vrátit token').toBeTruthy();

    const res = await page.request.get(`${API}/api/v1/properties/clzfake000000000000000000`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([403, 404]).toContain(res.status());
  });
});
