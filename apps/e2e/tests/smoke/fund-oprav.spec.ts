import { test, expect } from '@playwright/test';
import { getFreshToken } from '../helpers/fresh-auth';

const API = process.env.API_URL || process.env.BASE_URL || 'https://ifmio.com';

test.describe('Fond oprav', () => {

  test('fond oprav endpoint vrátí data pro existující property', async ({ page }) => {
    const token = await getFreshToken(page);

    // Získej první property
    const propRes = await page.request.get(`${API}/api/v1/properties`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (propRes.status() !== 200) return;
    const { data } = await propRes.json();
    if (!data?.length) return;

    const propertyId = data[0].id;
    const fundRes = await page.request.get(
      `${API}/api/v1/fund-oprav/${propertyId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(fundRes.status()).toBe(200);
    const fund = await fundRes.json();
    expect(fund).toHaveProperty('funds');
    expect(fund).toHaveProperty('totalBalance');
  });

  test('fond oprav entries endpoint vrátí paginated response', async ({ page }) => {
    const token = await getFreshToken(page);
    const propRes = await page.request.get(`${API}/api/v1/properties`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (propRes.status() !== 200) return;
    const { data } = await propRes.json();
    if (!data?.length) return;

    const res = await page.request.get(
      `${API}/api/v1/fund-oprav/${data[0].id}/entries`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('page');
  });
});
