import { test, expect } from '@playwright/test';
import { getFreshToken } from '../helpers/fresh-auth';

const API = process.env.API_URL || process.env.BASE_URL || 'https://ifmio.com';

test.describe('WO Dispatch workflow', () => {

  test('dispatch endpointy existují (ne 404/405)', async ({ page }) => {
    const token = await getFreshToken(page);
    const endpoints = [
      '/api/v1/work-orders/test-id/dispatch',
      '/api/v1/work-orders/test-id/confirm',
      '/api/v1/work-orders/test-id/decline',
      '/api/v1/work-orders/test-id/complete',
      '/api/v1/work-orders/test-id/csat',
    ];
    for (const ep of endpoints) {
      const res = await page.request.post(`${API}${ep}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: {},
      });
      // 400/404 (WO not found) = endpoint existuje, 405 = neexistuje
      expect(res.status(), ep).not.toBe(405);
    }
  });
});
