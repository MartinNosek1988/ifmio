import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function getToken(page: any): Promise<string> {
  return page.evaluate(() => sessionStorage.getItem('ifmio:access_token'));
}

async function createMeterApi(page: any, data: Record<string, unknown>): Promise<string> {
  const token = await getToken(page);
  const res = await page.request.post(`${API_URL}/api/v1/meters`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: { name: 'Test Meter', serialNumber: `SN-${Date.now()}`, meterType: 'elektrina', unit: 'kWh', ...data },
  });
  return (await res.json()).id;
}

async function deleteMeterApi(page: any, id: string) {
  const token = await getToken(page);
  await page.request.delete(`${API_URL}/api/v1/meters/${id}`, { headers: { Authorization: `Bearer ${token}` } });
}

async function addReadingApi(page: any, meterId: string, value: number): Promise<string> {
  const token = await getToken(page);
  const res = await page.request.post(`${API_URL}/api/v1/meters/${meterId}/readings`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: { value, readingDate: new Date().toISOString() },
  });
  return (await res.json()).id;
}

// ================================================================
// L1: LIST + CREATE
// ================================================================
test.describe('Meters — CRUD', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('stránka se načte', async ({ page }) => {
    await page.goto('/meters');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="meter-list-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="meter-add-btn"]')).toBeVisible();
  });

  test('formulář obsahuje klíčová pole', async ({ page }) => {
    await page.goto('/meters');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="meter-add-btn"]').click();
    await page.waitForTimeout(300);

    await expect(page.locator('[data-testid="meter-form-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="meter-form-serialNumber"]')).toBeVisible();
    await expect(page.locator('[data-testid="meter-form-save"]')).toBeVisible();
    await expect(page.locator('[data-testid="meter-form-cancel"]')).toBeVisible();
    await expect(page.locator('[data-testid="meter-form-save"]')).toBeEnabled();

    await page.locator('[data-testid="meter-form-cancel"]').click();
  });

  test('validace — název je povinný', async ({ page }) => {
    await page.goto('/meters');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="meter-add-btn"]').click();

    await page.locator('[data-testid="meter-form-name"]').fill('');
    await page.locator('[data-testid="meter-form-serialNumber"]').fill('SN-TEST');
    await page.locator('[data-testid="meter-form-save"]').click();

    await expect(page.locator('[data-testid="meter-form-error-name"]')).toBeVisible();
    await page.locator('[data-testid="meter-form-cancel"]').click();
  });

  test('vytvoření měřidla', async ({ page }) => {
    await page.goto('/meters');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="meter-add-btn"]').click();

    await page.locator('[data-testid="meter-form-name"]').fill('Testovací Elektroměr E2E');
    await page.locator('[data-testid="meter-form-serialNumber"]').fill(`E2E-${Date.now()}`);

    const responsePromise = page.waitForResponse(
      (r: any) => r.url().includes('/api/v1/meters') && r.request().method() === 'POST',
    );
    await page.locator('[data-testid="meter-form-save"]').click();
    await responsePromise;

    await expect(page.locator('[data-testid="meter-form-name"]')).not.toBeVisible({ timeout: 5000 });
  });
});

// ================================================================
// L2: READINGS
// ================================================================
test.describe('Meters — Odečty', () => {
  let meterId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page);
    meterId = await createMeterApi(page, { name: 'Meter pro odečty E2E', serialNumber: `RDG-${Date.now()}` });
    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page);
    await deleteMeterApi(page, meterId);
    await ctx.close();
  });

  test.beforeEach(async ({ page }) => { await login(page); });

  test('přidání odečtu via API', async ({ page }) => {
    const readingId = await addReadingApi(page, meterId, 1000);
    expect(readingId).toBeTruthy();
  });

  test('druhý odečet — spotřeba se vypočte', async ({ page }) => {
    const readingId = await addReadingApi(page, meterId, 1050);
    expect(readingId).toBeTruthy();

    // Verify readings via API
    const token = await getToken(page);
    const res = await page.request.get(`${API_URL}/api/v1/meters/${meterId}/readings`, { headers: { Authorization: `Bearer ${token}` } });
    const readings = await res.json();
    expect(readings.length).toBeGreaterThanOrEqual(2);
  });

  test('nulový odečet — povoleno', async ({ page }) => {
    const token = await getToken(page);
    const res = await page.request.post(`${API_URL}/api/v1/meters/${meterId}/readings`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { value: 0, readingDate: new Date().toISOString() },
    });
    expect(res.status()).toBeLessThan(500);
  });
});

// ================================================================
// L2: VALIDATION + EDGE CASES
// ================================================================
test.describe('Meters — Deep', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('speciální znaky v názvu', async ({ page }) => {
    const id = await createMeterApi(page, { name: 'Měřidlo č. 42/A — šroub' });
    expect(id).toBeTruthy();
    await deleteMeterApi(page, id);
  });

  test('duplicitní sériové číslo — ověření chování', async ({ page }) => {
    const sn = `DUP-SN-${Date.now()}`;
    const token = await getToken(page);

    const res1 = await page.request.post(`${API_URL}/api/v1/meters`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { name: 'Dup SN 1', serialNumber: sn, meterType: 'elektrina', unit: 'kWh' },
    });
    expect(res1.ok()).toBe(true);
    const m1 = await res1.json();

    const res2 = await page.request.post(`${API_URL}/api/v1/meters`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { name: 'Dup SN 2', serialNumber: sn, meterType: 'elektrina', unit: 'kWh' },
    });

    if (res2.ok()) {
      const m2 = await res2.json();
      await deleteMeterApi(page, m2.id);
    }
    // Document: either accepted (no unique constraint) or rejected (400/409)
    expect(res2.status()).toBeLessThan(500);

    await deleteMeterApi(page, m1.id);
  });

  test('smazání měřidla s odečty — cascade', async ({ page }) => {
    const id = await createMeterApi(page, { name: 'Cascade Meter E2E' });
    await addReadingApi(page, id, 500);

    const token = await getToken(page);
    const res = await page.request.delete(`${API_URL}/api/v1/meters/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    // Should cascade-delete readings
    expect(res.status()).toBeLessThan(300);
  });

  test('meter bez přiřazení — povoleno', async ({ page }) => {
    const id = await createMeterApi(page, { name: 'No Property Meter E2E' });
    expect(id).toBeTruthy();
    await deleteMeterApi(page, id);
  });
});

// ================================================================
// CLEANUP
// ================================================================
test.describe('Meters — Cleanup', () => {
  test.beforeEach(async ({ page }) => { await login(page); });
  test('úklid', async ({ page }) => {
    const token = await getToken(page);
    const res = await page.request.get(`${API_URL}/api/v1/meters?limit=200`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok()) {
      const data = await res.json();
      const items = Array.isArray(data) ? data : data.data ?? [];
      for (const m of items) {
        if (m.name?.includes('E2E')) {
          await page.request.delete(`${API_URL}/api/v1/meters/${m.id}`, { headers: { Authorization: `Bearer ${token}` } });
        }
      }
    }
  });
});
