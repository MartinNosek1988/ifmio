import { test, expect } from '@playwright/test';
import { getFreshToken } from '../helpers/fresh-auth';

const API = process.env.API_URL || process.env.BASE_URL || 'https://ifmio.com';

test.describe('Fond oprav', () => {
  test('fond oprav endpoint vrátí data', async ({ page }) => {
    const token = await getFreshToken(page);
    expect(token, 'getFreshToken musí vrátit token').toBeTruthy();

    const propRes = await page.request.get(`${API}/api/v1/properties`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (propRes.status() !== 200) {
      test.skip(true, 'Properties API nedostupné');
      return;
    }
    const { data } = await propRes.json();
    if (!data?.length) {
      test.skip(true, 'Žádné properties v test tenantu');
      return;
    }

    const res = await page.request.get(`${API}/api/v1/fund-oprav/${data[0].id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const fund = await res.json();
    expect(fund).toHaveProperty('funds');
    expect(fund).toHaveProperty('totalBalance');
  });

  test('fond oprav entries vrátí paginated response', async ({ page }) => {
    const token = await getFreshToken(page);
    expect(token, 'getFreshToken musí vrátit token').toBeTruthy();

    const propRes = await page.request.get(`${API}/api/v1/properties`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (propRes.status() !== 200) {
      test.skip(true, 'Properties API nedostupné');
      return;
    }
    const { data } = await propRes.json();
    if (!data?.length) {
      test.skip(true, 'Žádné properties v test tenantu');
      return;
    }

    const res = await page.request.get(`${API}/api/v1/fund-oprav/${data[0].id}/entries`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('page');
  });
});
