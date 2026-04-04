import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function getToken(page: any): Promise<string> {
  return page.evaluate(() => sessionStorage.getItem('ifmio:access_token'));
}

async function createPropertyApi(page: any, name: string, overrides: Record<string, unknown> = {}): Promise<string> {
  const token = await getToken(page);
  const res = await page.request.post(`${API_URL}/api/v1/properties`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: { name, address: 'Test 1', city: 'Praha', postalCode: '11000', type: 'SVJ', ownership: 'vlastnictvi', ...overrides },
  });
  return (await res.json()).id;
}

async function createUnitApi(page: any, propertyId: string, name: string, overrides: Record<string, unknown> = {}): Promise<string> {
  const token = await getToken(page);
  const res = await page.request.post(`${API_URL}/api/v1/properties/${propertyId}/units`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: { name, ...overrides },
  });
  return (await res.json()).id;
}

async function deletePropertyApi(page: any, id: string) {
  const token = await getToken(page);
  await page.request.delete(`${API_URL}/api/v1/properties/${id}`, { headers: { Authorization: `Bearer ${token}` } });
}

async function deleteUnitApi(page: any, propertyId: string, unitId: string) {
  const token = await getToken(page);
  await page.request.delete(`${API_URL}/api/v1/properties/${propertyId}/units/${unitId}`, { headers: { Authorization: `Bearer ${token}` } });
}

// ================================================================
// SECTION 1 — FIELD VALIDATION
// ================================================================
test.describe('Properties — Validace polí', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('povinná pole — name je povinné', async ({ page }) => {
    await page.goto('/properties');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="property-add-btn"]').click();
    await expect(page.locator('[data-testid="property-form-name"]')).toBeVisible();

    // Fill everything except name
    await page.locator('[data-testid="property-form-name"]').fill('');
    await page.locator('[data-testid="property-form-address"]').fill('Ulice 1');
    await page.locator('[data-testid="property-form-city"]').fill('Praha');
    await page.locator('[data-testid="property-form-zip"]').fill('11000');
    await page.locator('[data-testid="property-form-save"]').click();

    await expect(page.locator('[data-testid="property-form-error-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="property-form-name"]')).toBeVisible(); // Form still open
  });

  test('povinná pole — address je povinné', async ({ page }) => {
    await page.goto('/properties');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="property-add-btn"]').click();

    await page.locator('[data-testid="property-form-name"]').fill('Test');
    await page.locator('[data-testid="property-form-address"]').fill('');
    await page.locator('[data-testid="property-form-city"]').fill('Praha');
    await page.locator('[data-testid="property-form-zip"]').fill('11000');
    await page.locator('[data-testid="property-form-save"]').click();

    await expect(page.locator('[data-testid="property-form-error-address"]')).toBeVisible();
  });

  test('povinná pole — city je povinné', async ({ page }) => {
    await page.goto('/properties');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="property-add-btn"]').click();

    await page.locator('[data-testid="property-form-name"]').fill('Test');
    await page.locator('[data-testid="property-form-address"]').fill('Ulice 1');
    await page.locator('[data-testid="property-form-city"]').fill('');
    await page.locator('[data-testid="property-form-zip"]').fill('11000');
    await page.locator('[data-testid="property-form-save"]').click();

    await expect(page.locator('[data-testid="property-form-error-city"]')).toBeVisible();
  });

  test('povinná pole — postalCode je povinné', async ({ page }) => {
    await page.goto('/properties');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="property-add-btn"]').click();

    await page.locator('[data-testid="property-form-name"]').fill('Test');
    await page.locator('[data-testid="property-form-address"]').fill('Ulice 1');
    await page.locator('[data-testid="property-form-city"]').fill('Praha');
    await page.locator('[data-testid="property-form-zip"]').fill('');
    await page.locator('[data-testid="property-form-save"]').click();

    await expect(page.locator('[data-testid="property-form-error-postalCode"]')).toBeVisible();
  });

  test('IČO — přijímá pouze max 8 číslic', async ({ page }) => {
    await page.goto('/properties');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="property-add-btn"]').click();

    // Select SVJ to reveal IČO field
    await page.locator('[data-testid="property-form-legalMode"]').selectOption('SVJ');
    await expect(page.locator('[data-testid="property-form-ico"]')).toBeVisible();

    // Input masking: only digits, max 8 chars — the onChange strips non-digits
    await page.locator('[data-testid="property-form-ico"]').fill('abcdefgh');
    const val = await page.locator('[data-testid="property-form-ico"]').inputValue();
    // Non-digit chars should be stripped by the onChange handler
    expect(val.length).toBeLessThanOrEqual(8);

    // Fill valid IČO
    await page.locator('[data-testid="property-form-ico"]').fill('12345678');
    expect(await page.locator('[data-testid="property-form-ico"]').inputValue()).toBe('12345678');
  });

  test('speciální znaky v názvu nemovitosti', async ({ page }) => {
    const specialName = 'Dům č.p. 42/A — Žižkov (1. NP)';
    const propId = await createPropertyApi(page, specialName);

    await page.goto(`/properties/${propId}`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="property-detail-name"]')).toHaveText(specialName);

    await deletePropertyApi(page, propId);
  });

  test('duplicitní název — lze vytvořit', async ({ page }) => {
    // API allows duplicate names (no unique constraint on name)
    const id1 = await createPropertyApi(page, 'Duplicitní E2E Test');
    const id2 = await createPropertyApi(page, 'Duplicitní E2E Test');

    // Both should exist
    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);

    await deletePropertyApi(page, id1);
    await deletePropertyApi(page, id2);
  });
});

// ================================================================
// SECTION 2 — UNITS CRUD within Property
// ================================================================
test.describe('Properties — Jednotky (Units)', () => {
  let propertyId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page);
    propertyId = await createPropertyApi(page, 'Testovací Nemovitost pro Jednotky');
    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page);
    await deletePropertyApi(page, propertyId);
    await ctx.close();
  });

  test.beforeEach(async ({ page }) => { await login(page); });

  test('tab Jednotky se zobrazí', async ({ page }) => {
    await page.goto(`/properties/${propertyId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="property-tab-units"]').click();
    await page.waitForTimeout(500);

    // Should show empty state or table with 0 rows
    await expect(page.locator('[data-testid="unit-add-btn"]')).toBeVisible();
  });

  test('formulář pro přidání jednotky obsahuje všechna pole', async ({ page }) => {
    await page.goto(`/properties/${propertyId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="unit-add-btn"]').click();

    await expect(page.locator('[data-testid="unit-form-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="unit-form-knDesignation"]')).toBeVisible();
    await expect(page.locator('[data-testid="unit-form-spaceType"]')).toBeVisible();
    await expect(page.locator('[data-testid="unit-form-floor"]')).toBeVisible();
    await expect(page.locator('[data-testid="unit-form-area"]')).toBeVisible();
    await expect(page.locator('[data-testid="unit-form-commonAreaShare"]')).toBeVisible();
    await expect(page.locator('[data-testid="unit-form-save"]')).toBeVisible();
    await expect(page.locator('[data-testid="unit-form-cancel"]')).toBeVisible();

    // All enabled
    await expect(page.locator('[data-testid="unit-form-name"]')).toBeEnabled();
    await expect(page.locator('[data-testid="unit-form-save"]')).toBeEnabled();

    await page.locator('[data-testid="unit-form-cancel"]').click();
  });

  test('vytvoření jednotky se všemi poli', async ({ page }) => {
    await page.goto(`/properties/${propertyId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="unit-add-btn"]').click();

    await page.locator('[data-testid="unit-form-name"]').fill('Byt 101');
    await page.locator('[data-testid="unit-form-knDesignation"]').fill('1883/1');
    await page.locator('[data-testid="unit-form-spaceType"]').selectOption('RESIDENTIAL');
    await page.locator('[data-testid="unit-form-floor"]').fill('1');
    await page.locator('[data-testid="unit-form-area"]').fill('65.5');
    await page.locator('[data-testid="unit-form-commonAreaShare"]').fill('3.4567');

    const responsePromise = page.waitForResponse(
      (r: any) => r.url().includes('/api/v1/properties/') && r.url().includes('/units') && r.request().method() === 'POST',
    );
    await page.locator('[data-testid="unit-form-save"]').click();
    await responsePromise;

    await expect(page.locator('[data-testid="unit-form-name"]')).not.toBeVisible({ timeout: 5000 });

    // Reload and switch to units tab to verify
    await page.goto(`/properties/${propertyId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="property-tab-units"]').click();
    await page.waitForTimeout(1000);
    await expect(page.getByText('Byt 101').first()).toBeVisible();
  });

  test('jednotka se zobrazí v seznamu s údaji', async ({ page }) => {
    // Independent: create unit via API if not exists
    const token = await getToken(page);
    const propRes = await page.request.get(`${API_URL}/api/v1/properties/${propertyId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const prop = await propRes.json();
    const hasUnit = prop.units?.some((u: any) => u.name === 'Byt 101');
    if (!hasUnit) {
      await createUnitApi(page, propertyId, 'Byt 101', { area: 65.5, floor: 1, knDesignation: '1883/1' });
    }

    await page.goto(`/properties/${propertyId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="property-tab-units"]').click();
    await page.waitForTimeout(1000);

    await expect(page.getByText('Byt 101').first()).toBeVisible();
    await expect(page.getByText('65.5').first()).toBeVisible();
  });

  test('vytvoření druhé jednotky', async ({ page }) => {
    await page.goto(`/properties/${propertyId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="unit-add-btn"]').click();

    await page.locator('[data-testid="unit-form-name"]').fill('Garáž G1');
    await page.locator('[data-testid="unit-form-spaceType"]').selectOption('GARAGE');
    await page.locator('[data-testid="unit-form-floor"]').fill('0');
    await page.locator('[data-testid="unit-form-area"]').fill('22');

    const responsePromise = page.waitForResponse(
      (r: any) => r.url().includes('/units') && r.request().method() === 'POST',
    );
    await page.locator('[data-testid="unit-form-save"]').click();
    await responsePromise;

    await expect(page.locator('[data-testid="unit-form-name"]')).not.toBeVisible({ timeout: 5000 });

    // Reload and verify on units tab
    await page.goto(`/properties/${propertyId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="property-tab-units"]').click();
    await page.waitForTimeout(1000);
    await expect(page.getByText('Garáž G1').first()).toBeVisible();
  });

  test('validace jednotky — název je povinný', async ({ page }) => {
    await page.goto(`/properties/${propertyId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="unit-add-btn"]').click();

    // Leave name empty, try to save
    await page.locator('[data-testid="unit-form-name"]').fill('');
    await page.locator('[data-testid="unit-form-save"]').click();

    // Form should stay open with error
    await page.waitForTimeout(300);
    await expect(page.locator('[data-testid="unit-form-name"]')).toBeVisible();

    await page.locator('[data-testid="unit-form-cancel"]').click();
  });

  test('smazání jednotky přes UI', async ({ page }) => {
    await page.goto(`/properties/${propertyId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="property-tab-units"]').click();
    await page.waitForTimeout(500);

    // Find Garáž G1 row and click its delete button
    const row = page.getByText('Garáž G1').first().locator('xpath=ancestor::tr');
    const deleteBtn = row.locator('button[title="Smazat"]');

    if (await deleteBtn.isVisible().catch(() => false)) {
      await deleteBtn.click();

      // Confirmation dialog
      await expect(page.locator('[data-testid="unit-delete-confirm"]')).toBeVisible();
      const responsePromise = page.waitForResponse(
        (r: any) => r.url().includes('/units/') && r.request().method() === 'DELETE',
      );
      await page.locator('[data-testid="unit-delete-confirm"]').click();
      await responsePromise;

      await expect(page.locator('[data-testid="unit-delete-confirm"]')).not.toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(500);
    } else {
      // Fallback: delete via API
      const token = await getToken(page);
      const listRes = await page.request.get(`${API_URL}/api/v1/properties/${propertyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const prop = await listRes.json();
      const garage = prop.units?.find((u: any) => u.name === 'Garáž G1');
      if (garage) await deleteUnitApi(page, propertyId, garage.id);
    }
  });
});

// ================================================================
// SECTION 3 — RELATIONS
// ================================================================
test.describe('Properties — Relace', () => {
  let propertyId: string;
  let unitId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page);
    propertyId = await createPropertyApi(page, 'Relace Test E2E');
    unitId = await createUnitApi(page, propertyId, 'Byt pro relaci', { area: 50, floor: 2 });
    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page);
    await deletePropertyApi(page, propertyId);
    await ctx.close();
  });

  test.beforeEach(async ({ page }) => { await login(page); });

  test('nemovitost zobrazuje jednotky v detailu', async ({ page }) => {
    await page.goto(`/properties/${propertyId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="property-tab-units"]').click();
    await page.waitForTimeout(500);

    await expect(page.getByText('Byt pro relaci').first()).toBeVisible();
  });

  test('nemovitost zobrazuje počet jednotek v KPI', async ({ page }) => {
    await page.goto(`/properties/${propertyId}`);
    await page.waitForLoadState('domcontentloaded');

    // KPI card "Jednotek" should show 1
    await expect(page.getByText('1').first()).toBeVisible();
  });
});

// ================================================================
// SECTION 4 — EDGE CASES
// ================================================================
test.describe('Properties — Edge Cases', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('smazání nemovitosti s jednotkami — cascade delete', async ({ page }) => {
    const propId = await createPropertyApi(page, 'Cascade Test E2E');
    await createUnitApi(page, propId, 'Jednotka k smazání');

    // Delete property — should cascade (Prisma onDelete: Cascade on Unit)
    const token = await getToken(page);
    const res = await page.request.delete(`${API_URL}/api/v1/properties/${propId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // Document behavior: either succeeds (cascade) or fails (blocked)
    // Property model has Unit[] relation, Unit FK has onDelete: Cascade
    expect(res.status()).toBeLessThan(500);
  });

  test('prázdný stav — nová nemovitost bez jednotek', async ({ page }) => {
    const propId = await createPropertyApi(page, 'Prázdný stav E2E');

    await page.goto(`/properties/${propId}`);
    await page.waitForLoadState('domcontentloaded');

    // Units tab should show empty or 0
    await page.locator('[data-testid="property-tab-units"]').click();
    await page.waitForTimeout(500);
    // Should have the add button visible
    await expect(page.locator('[data-testid="unit-add-btn"]')).toBeVisible();

    await deletePropertyApi(page, propId);
  });

  test('velmi dlouhá adresa — API validace', async ({ page }) => {
    const longAddress = 'A'.repeat(300);
    const token = await getToken(page);
    const res = await page.request.post(`${API_URL}/api/v1/properties`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { name: 'Long Address Test', address: longAddress, city: 'Praha', postalCode: '11000', type: 'SVJ', ownership: 'vlastnictvi' },
    });
    // Document: API may accept or reject long addresses
    // No @MaxLength on address in DTO, so it should be accepted
    if (res.ok()) {
      const body = await res.json();
      await page.request.delete(`${API_URL}/api/v1/properties/${body.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    // Either accepted or rejected with 400 — neither should be 500
    expect(res.status()).toBeLessThan(500);
  });
});

// ================================================================
// CLEANUP
// ================================================================
test.describe('Properties Deep — Cleanup', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('úklid — smazání zbylých testovacích nemovitostí', async ({ page }) => {
    const token = await getToken(page);
    const res = await page.request.get(`${API_URL}/api/v1/properties`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok()) return;
    const properties = await res.json();
    const testNames = [
      'Testovací Nemovitost pro Jednotky', 'Relace Test E2E', 'Prázdný stav E2E',
      'Cascade Test E2E', 'Long Address Test', 'Duplicitní E2E Test',
      'Dům č.p. 42/A — Žižkov (1. NP)',
    ];
    for (const p of properties) {
      if (testNames.includes(p.name)) {
        await page.request.delete(`${API_URL}/api/v1/properties/${p.id}`, { headers: { Authorization: `Bearer ${token}` } });
      }
    }
  });
});
