import { test, expect } from '@playwright/test';
import { getFreshToken } from '../helpers/fresh-auth';

const API = process.env.API_URL || process.env.BASE_URL || 'https://ifmio.com';

test.describe('Chatter & Activity systém', () => {

  test('GET /chatter/:entityType/:entityId vrací správnou strukturu', async ({ page }) => {
    const token = await getFreshToken(page);
    const res = await page.request.get(
      `${API}/api/v1/chatter/Invoice/clztest000000000000000000`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    // 200 s prázdným threadem nebo 404 — oboje OK, 500 = bug
    expect(res.status()).not.toBe(500);
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('messages');
      expect(body).toHaveProperty('activities');
    }
  });

  test('GET /activity-types vrátí defaultní typy', async ({ page }) => {
    const token = await getFreshToken(page);
    const res = await page.request.get(`${API}/api/v1/activity-types`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const types = await res.json();
    expect(Array.isArray(types)).toBeTruthy();
    expect(types.length).toBeGreaterThanOrEqual(1);
    if (types.length > 0) {
      expect(types[0]).toHaveProperty('name');
      expect(types[0]).toHaveProperty('kind');
    }
  });

  test('GET /activities/my vrátí seznam', async ({ page }) => {
    const token = await getFreshToken(page);
    const res = await page.request.get(`${API}/api/v1/activities/my`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const activities = await res.json();
    expect(Array.isArray(activities)).toBeTruthy();
  });
});
