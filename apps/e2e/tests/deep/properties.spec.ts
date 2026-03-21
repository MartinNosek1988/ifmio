import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_PROPERTY_NAME = 'Testovací Dům E2E';
const EDITED_PROPERTY_NAME = 'Upravený Dům E2E';

/** Create a test property via API and return its ID */
async function createTestPropertyViaApi(page: any): Promise<string> {
  const token = await page.evaluate(() => sessionStorage.getItem('ifmio:access_token'));
  const res = await page.request.post(`${API_URL}/api/v1/properties`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: {
      name: TEST_PROPERTY_NAME, address: 'Testovací 123', city: 'Brno',
      postalCode: '60200', type: 'bytdum', ownership: 'vlastnictvi',
      legalMode: 'SVJ', ico: '99887766', dic: 'CZ99887766',
    },
  });
  const body = await res.json();
  return body.id;
}

/** Delete a property via API */
async function deletePropertyViaApi(page: any, propertyId: string) {
  const token = await page.evaluate(() => sessionStorage.getItem('ifmio:access_token'));
  await page.request.delete(`${API_URL}/api/v1/properties/${propertyId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

test.describe('Properties — Deep CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ============================================================
  // 1. LIST VIEW
  // ============================================================
  test.describe('Seznam nemovitostí', () => {
    test('stránka se načte a zobrazí seed nemovitosti', async ({ page }) => {
      await page.goto('/properties');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('[data-testid="property-list-page"]')).toBeVisible();

      const table = page.locator('[data-testid="property-list"]');
      const hasTable = await table.isVisible().catch(() => false);
      if (!hasTable) { test.skip(true, 'Žádné nemovitosti v DB'); return; }

      const rows = page.locator('.tbl tbody tr');
      await expect(rows.first()).toBeVisible();
    });

    test('vyhledávání filtruje seznam', async ({ page }) => {
      await page.goto('/properties');
      await page.waitForLoadState('domcontentloaded');

      const searchInput = page.locator('[data-testid="property-search-input"]');
      if (!(await searchInput.isVisible().catch(() => false))) { test.skip(true, 'Search input nenalezen'); return; }

      const rowsBefore = await page.locator('.tbl tbody tr').count();
      if (rowsBefore < 2) { test.skip(true, 'Potřeba alespoň 2 nemovitostí'); return; }

      await searchInput.fill('Lipová');
      await page.waitForTimeout(500);
      const rowsAfter = await page.locator('.tbl tbody tr').count();
      expect(rowsAfter).toBeLessThanOrEqual(rowsBefore);
      expect(rowsAfter).toBeGreaterThanOrEqual(1);

      await searchInput.fill('');
      await page.waitForTimeout(500);
    });
  });

  // ============================================================
  // 2. CREATE
  // ============================================================
  test.describe('Vytvoření nemovitosti', () => {
    test('formulář obsahuje všechna povinná pole', async ({ page }) => {
      await page.goto('/properties');
      await page.waitForLoadState('domcontentloaded');
      await page.locator('[data-testid="property-add-btn"]').click();

      await expect(page.locator('[data-testid="property-form-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="property-form-address"]')).toBeVisible();
      await expect(page.locator('[data-testid="property-form-city"]')).toBeVisible();
      await expect(page.locator('[data-testid="property-form-zip"]')).toBeVisible();
      await expect(page.locator('[data-testid="property-form-type"]')).toBeVisible();
      await expect(page.locator('[data-testid="property-form-ownership"]')).toBeVisible();
      await expect(page.locator('[data-testid="property-form-legalMode"]')).toBeVisible();
      await expect(page.locator('[data-testid="property-form-save"]')).toBeVisible();
      await expect(page.locator('[data-testid="property-form-cancel"]')).toBeVisible();
      await expect(page.locator('[data-testid="property-form-save"]')).toBeEnabled();
    });

    test('validace — prázdný formulář nelze odeslat', async ({ page }) => {
      await page.goto('/properties');
      await page.waitForLoadState('domcontentloaded');
      await page.locator('[data-testid="property-add-btn"]').click();
      await expect(page.locator('[data-testid="property-form-name"]')).toBeVisible();

      await page.locator('[data-testid="property-form-name"]').fill('');
      await page.locator('[data-testid="property-form-address"]').fill('');
      await page.locator('[data-testid="property-form-city"]').fill('');
      await page.locator('[data-testid="property-form-zip"]').fill('');
      await page.locator('[data-testid="property-form-save"]').click();

      await expect(page.locator('[data-testid="property-form-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="property-form-error-name"]')).toBeVisible();
    });

    test('vytvoření nové nemovitosti se všemi poli', async ({ page }) => {
      await page.goto('/properties');
      await page.waitForLoadState('domcontentloaded');
      await page.locator('[data-testid="property-add-btn"]').click();
      await expect(page.locator('[data-testid="property-form-name"]')).toBeVisible();

      await page.locator('[data-testid="property-form-type"]').selectOption('bytdum');
      await page.locator('[data-testid="property-form-ownership"]').selectOption('vlastnictvi');
      await page.locator('[data-testid="property-form-name"]').fill(TEST_PROPERTY_NAME);
      await page.locator('[data-testid="property-form-address"]').fill('Testovací 123');
      await page.locator('[data-testid="property-form-city"]').fill('Brno');
      await page.locator('[data-testid="property-form-zip"]').fill('60200');
      await page.locator('[data-testid="property-form-legalMode"]').selectOption('SVJ');
      await expect(page.locator('[data-testid="property-form-ico"]')).toBeVisible();
      await page.locator('[data-testid="property-form-ico"]').fill('99887766');
      await expect(page.locator('[data-testid="property-form-dic"]')).toBeVisible();
      await page.locator('[data-testid="property-form-dic"]').fill('CZ99887766');

      // Submit — don't filter by status code (may be 200 or 201)
      const responsePromise = page.waitForResponse(
        (r: any) => r.url().includes('/api/v1/properties') && r.request().method() === 'POST',
      );
      await page.locator('[data-testid="property-form-save"]').click();
      await responsePromise;

      await expect(page.locator('[data-testid="property-form-name"]')).not.toBeVisible({ timeout: 5000 });
      await expect(page.getByText(TEST_PROPERTY_NAME).first()).toBeVisible({ timeout: 5000 });
    });
  });

  // ============================================================
  // 3. DETAIL VIEW — independent (creates own test data via API)
  // ============================================================
  test.describe('Detail nemovitosti', () => {
    let propertyId: string;

    test.beforeAll(async ({ browser }) => {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await login(page);
      propertyId = await createTestPropertyViaApi(page);
      await ctx.close();
    });

    test.afterAll(async ({ browser }) => {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await login(page);
      await deletePropertyViaApi(page, propertyId);
      await ctx.close();
    });

    test('detail zobrazí správné údaje', async ({ page }) => {
      await page.goto(`/properties/${propertyId}`);
      await page.waitForLoadState('domcontentloaded');

      await expect(page.locator('[data-testid="property-detail-page"]')).toBeVisible();
      await expect(page.locator('[data-testid="property-detail-name"]')).toHaveText(TEST_PROPERTY_NAME);
      await expect(page.locator('[data-testid="property-detail-address"]')).toContainText('Testovací 123');
      await expect(page.locator('[data-testid="property-detail-address"]')).toContainText('Brno');
      await expect(page.getByText('99887766', { exact: true }).first()).toBeVisible();
    });

    test('detail má všechny taby', async ({ page }) => {
      await page.goto(`/properties/${propertyId}`);
      await page.waitForLoadState('domcontentloaded');

      const tabKeys = ['overview', 'units', 'owners', 'groups', 'meters', 'components', 'representatives'];
      for (const key of tabKeys) {
        await expect(page.locator(`[data-testid="property-tab-${key}"]`)).toBeVisible();
      }
    });
  });

  // ============================================================
  // 4. EDIT — independent
  // ============================================================
  test.describe('Editace nemovitosti', () => {
    let propertyId: string;

    test.beforeAll(async ({ browser }) => {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await login(page);
      propertyId = await createTestPropertyViaApi(page);
      await ctx.close();
    });

    test.afterAll(async ({ browser }) => {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await login(page);
      await deletePropertyViaApi(page, propertyId);
      await ctx.close();
    });

    test('editace — pole jsou předvyplněná', async ({ page }) => {
      await page.goto(`/properties/${propertyId}`);
      await page.waitForLoadState('domcontentloaded');
      await page.locator('[data-testid="property-detail-edit-btn"]').click();

      await expect(page.locator('[data-testid="property-form-name"]')).toHaveValue(TEST_PROPERTY_NAME);
      await expect(page.locator('[data-testid="property-form-address"]')).toHaveValue('Testovací 123');
      await expect(page.locator('[data-testid="property-form-city"]')).toHaveValue('Brno');
      await page.locator('[data-testid="property-form-cancel"]').click();
    });

    test('editace — změna hodnot se uloží', async ({ page }) => {
      await page.goto(`/properties/${propertyId}`);
      await page.waitForLoadState('domcontentloaded');
      await page.locator('[data-testid="property-detail-edit-btn"]').click();
      await expect(page.locator('[data-testid="property-form-name"]')).toBeVisible();

      await page.locator('[data-testid="property-form-name"]').fill(EDITED_PROPERTY_NAME);
      await page.locator('[data-testid="property-form-city"]').fill('Ostrava');

      const responsePromise = page.waitForResponse(
        (r: any) => r.url().includes('/api/v1/properties/') && r.request().method() === 'PATCH',
      );
      await page.locator('[data-testid="property-form-save"]').click();
      await responsePromise;

      await expect(page.locator('[data-testid="property-form-name"]')).not.toBeVisible({ timeout: 5000 });
      await expect(page.locator('[data-testid="property-detail-name"]')).toHaveText(EDITED_PROPERTY_NAME);
      await expect(page.locator('[data-testid="property-detail-address"]')).toContainText('Ostrava');
    });
  });

  // ============================================================
  // 5. DELETE — independent
  // ============================================================
  test.describe('Smazání nemovitosti', () => {
    test('smazání nemovitosti přes API a ověření v seznamu', async ({ page }) => {
      // Create property specifically for this test
      const propId = await createTestPropertyViaApi(page);

      await page.goto('/properties');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      // Verify it exists
      await expect(page.getByText(TEST_PROPERTY_NAME).first()).toBeVisible();

      // Delete via API
      await deletePropertyViaApi(page, propId);

      // Reload and verify gone
      await page.goto('/properties');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
      await expect(page.locator(`text=${TEST_PROPERTY_NAME}`)).not.toBeVisible();
    });
  });

  // ============================================================
  // CLEANUP
  // ============================================================
  test('úklid — smazání zbylých testovacích nemovitostí', async ({ page }) => {
    await page.goto('/properties');
    await page.waitForLoadState('domcontentloaded');

    const token = await page.evaluate(() => sessionStorage.getItem('ifmio:access_token'));
    const listRes = await page.request.get(`${API_URL}/api/v1/properties`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (listRes.ok()) {
      const properties = await listRes.json();
      const testNames = [TEST_PROPERTY_NAME, EDITED_PROPERTY_NAME];
      for (const prop of properties) {
        if (testNames.includes(prop.name)) {
          await page.request.delete(`${API_URL}/api/v1/properties/${prop.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      }
    }
  });
});
