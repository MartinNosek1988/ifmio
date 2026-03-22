import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function getToken(page: any): Promise<string> {
  return page.evaluate(() => sessionStorage.getItem('ifmio:access_token'));
}

async function createAssetApi(page: any, data: Record<string, unknown>): Promise<string> {
  const token = await getToken(page);
  const res = await page.request.post(`${API_URL}/api/v1/assets`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: { name: 'Test Asset', category: 'tzb', ...data },
  });
  return (await res.json()).id;
}

async function deleteAssetApi(page: any, id: string) {
  const token = await getToken(page);
  await page.request.delete(`${API_URL}/api/v1/assets/${id}`, { headers: { Authorization: `Bearer ${token}` } });
}

// ================================================================
// L1: LIST + CREATE
// ================================================================
test.describe('Assets — CRUD', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('stránka se načte', async ({ page }) => {
    await page.goto('/assets');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="asset-list-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="asset-add-btn"]')).toBeVisible();
  });

  test('formulář obsahuje klíčová pole', async ({ page }) => {
    await page.goto('/assets');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="asset-add-btn"]').click();
    await page.waitForTimeout(300);

    await expect(page.locator('[data-testid="asset-form-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="asset-form-category"]')).toBeVisible();
    await expect(page.locator('[data-testid="asset-form-save"]')).toBeVisible();
    await expect(page.locator('[data-testid="asset-form-cancel"]')).toBeVisible();
    await expect(page.locator('[data-testid="asset-form-save"]')).toBeEnabled();

    await page.locator('[data-testid="asset-form-cancel"]').click();
  });

  test('validace — název je povinný', async ({ page }) => {
    await page.goto('/assets');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="asset-add-btn"]').click();

    await page.locator('[data-testid="asset-form-name"]').fill('');
    await page.locator('[data-testid="asset-form-save"]').click();

    await expect(page.locator('[data-testid="asset-form-error-name"]')).toBeVisible();
    await page.locator('[data-testid="asset-form-cancel"]').click();
  });

  test('vytvoření assetu', async ({ page }) => {
    await page.goto('/assets');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="asset-add-btn"]').click();

    await page.locator('[data-testid="asset-form-name"]').fill('Testovací Kotel E2E');
    await page.locator('[data-testid="asset-form-category"]').selectOption('tzb');

    const responsePromise = page.waitForResponse(
      (r: any) => r.url().includes('/api/v1/assets') && r.request().method() === 'POST',
    );
    await page.locator('[data-testid="asset-form-save"]').click();
    await responsePromise;

    await expect(page.locator('[data-testid="asset-form-name"]')).not.toBeVisible({ timeout: 5000 });
  });
});

// ================================================================
// L2: VALIDATION + EDGE CASES
// ================================================================
test.describe('Assets — Deep', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('speciální znaky v názvu', async ({ page }) => {
    const id = await createAssetApi(page, { name: 'Kotel č. 42/A — Žižkov' });
    expect(id).toBeTruthy();
    const token = await getToken(page);
    const res = await page.request.get(`${API_URL}/api/v1/assets/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    expect((await res.json()).name).toBe('Kotel č. 42/A — Žižkov');
    await deleteAssetApi(page, id);
  });

  test('asset bez přiřazení — povoleno', async ({ page }) => {
    const id = await createAssetApi(page, { name: 'Asset No Property E2E' });
    expect(id).toBeTruthy();
    const token = await getToken(page);
    const res = await page.request.get(`${API_URL}/api/v1/assets/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    expect((await res.json()).propertyId).toBeFalsy();
    await deleteAssetApi(page, id);
  });

  test('duplicitní název — povoleno', async ({ page }) => {
    const id1 = await createAssetApi(page, { name: 'Dup Asset E2E' });
    const id2 = await createAssetApi(page, { name: 'Dup Asset E2E' });
    expect(id1).not.toBe(id2);
    await deleteAssetApi(page, id1);
    await deleteAssetApi(page, id2);
  });

  test('smazání assetu via API', async ({ page }) => {
    const id = await createAssetApi(page, { name: 'Delete Asset E2E' });
    const token = await getToken(page);
    const res = await page.request.delete(`${API_URL}/api/v1/assets/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status()).toBeLessThan(300);
  });
});

// ================================================================
// CLEANUP
// ================================================================
test.describe('Assets — Cleanup', () => {
  test.beforeEach(async ({ page }) => { await login(page); });
  test('úklid', async ({ page }) => {
    const token = await getToken(page);
    const res = await page.request.get(`${API_URL}/api/v1/assets?limit=200`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok()) {
      const data = await res.json();
      const items = Array.isArray(data) ? data : data.data ?? [];
      for (const a of items) {
        if (a.name?.includes('E2E')) {
          await page.request.delete(`${API_URL}/api/v1/assets/${a.id}`, { headers: { Authorization: `Bearer ${token}` } });
        }
      }
    }
  });
});
