import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
const API_URL = process.env.API_URL || 'http://localhost:3000';
async function getToken(page: any) { return page.evaluate(() => sessionStorage.getItem('ifmio:access_token')); }

async function createAssetTypeApi(page: any, data: Record<string, unknown>): Promise<string> {
  const token = await getToken(page);
  const res = await page.request.post(`${API_URL}/api/v1/asset-types`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: { name: 'Test Type', code: `TT-${Date.now()}`, category: 'kotelna', ...data },
  });
  return (await res.json()).id;
}

async function deleteAssetTypeApi(page: any, id: string) {
  const token = await getToken(page);
  await page.request.delete(`${API_URL}/api/v1/asset-types/${id}`, { headers: { Authorization: `Bearer ${token}` } });
}

test.describe('Asset Types — CRUD + Deep', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('stránka se načte', async ({ page }) => {
    await page.goto('/asset-types');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="asset-types-page"]')).toBeVisible({ timeout: 15000 });
  });

  test('vytvoření asset type via API', async ({ page }) => {
    const id = await createAssetTypeApi(page, { name: 'Kotel E2E', code: `KOT-E2E-${Date.now()}` });
    expect(id).toBeTruthy();
    await deleteAssetTypeApi(page, id);
  });

  test('API — validace — name povinný', async ({ page }) => {
    const token = await getToken(page);
    const res = await page.request.post(`${API_URL}/api/v1/asset-types`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { code: `NO-NAME-${Date.now()}`, category: 'kotelna' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('speciální znaky v názvu', async ({ page }) => {
    const id = await createAssetTypeApi(page, { name: 'Typ č. 42/A — Žižkov', code: `SPE-${Date.now()}` });
    expect(id).toBeTruthy();
    await deleteAssetTypeApi(page, id);
  });

  test('smazání via API', async ({ page }) => {
    const id = await createAssetTypeApi(page, { name: 'Delete Type E2E', code: `DEL-${Date.now()}` });
    const token = await getToken(page);
    const res = await page.request.delete(`${API_URL}/api/v1/asset-types/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status()).toBeLessThan(300);
  });
});

test.describe('Asset Types — Cleanup', () => {
  test.beforeEach(async ({ page }) => { await login(page); });
  test('úklid', async ({ page }) => {
    const token = await getToken(page);
    const res = await page.request.get(`${API_URL}/api/v1/asset-types`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok()) {
      const items = await res.json();
      for (const t of (Array.isArray(items) ? items : items.data ?? [])) {
        if (t.name?.includes('E2E')) {
          await page.request.delete(`${API_URL}/api/v1/asset-types/${t.id}`, { headers: { Authorization: `Bearer ${token}` } });
        }
      }
    }
  });
});
