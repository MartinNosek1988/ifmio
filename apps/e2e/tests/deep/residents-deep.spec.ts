import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function getToken(page: any): Promise<string> {
  return page.evaluate(() => sessionStorage.getItem('ifmio:access_token'));
}

async function createPropertyApi(page: any, name: string): Promise<string> {
  const token = await getToken(page);
  const res = await page.request.post(`${API_URL}/api/v1/properties`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: { name, address: 'Residents Deep 1', city: 'Praha', postalCode: '11000', type: 'bytdum', ownership: 'vlastnictvi' },
  });
  return (await res.json()).id;
}

async function createUnitApi(page: any, propertyId: string, name: string): Promise<string> {
  const token = await getToken(page);
  const res = await page.request.post(`${API_URL}/api/v1/properties/${propertyId}/units`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: { name },
  });
  return (await res.json()).id;
}

async function createResidentApi(page: any, data: Record<string, unknown>): Promise<string> {
  const token = await getToken(page);
  const res = await page.request.post(`${API_URL}/api/v1/residents`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data,
  });
  return (await res.json()).id;
}

async function deleteResidentApi(page: any, id: string) {
  const token = await getToken(page);
  await page.request.delete(`${API_URL}/api/v1/residents/${id}`, { headers: { Authorization: `Bearer ${token}` } });
}

async function deletePropertyApi(page: any, id: string) {
  const token = await getToken(page);
  await page.request.delete(`${API_URL}/api/v1/properties/${id}`, { headers: { Authorization: `Bearer ${token}` } });
}

// ================================================================
// SECTION 1 — VALIDACE POLÍ (API-level)
// ================================================================
test.describe('Residents — Validace polí', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('jméno a příjmení jsou povinné', async ({ page }) => {
    const token = await getToken(page);

    // Missing firstName
    const res1 = await page.request.post(`${API_URL}/api/v1/residents`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { lastName: 'Test', role: 'tenant' },
    });
    expect(res1.status()).toBeGreaterThanOrEqual(400);

    // Missing lastName
    const res2 = await page.request.post(`${API_URL}/api/v1/residents`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { firstName: 'Test', role: 'tenant' },
    });
    expect(res2.status()).toBeGreaterThanOrEqual(400);
  });

  test('email — API validuje formát', async ({ page }) => {
    const token = await getToken(page);

    const res = await page.request.post(`${API_URL}/api/v1/residents`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { firstName: 'Email', lastName: 'Test', role: 'tenant', email: 'not-valid' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('role — musí být platná enum hodnota', async ({ page }) => {
    const token = await getToken(page);

    const res = await page.request.post(`${API_URL}/api/v1/residents`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { firstName: 'Role', lastName: 'Test', role: 'invalid_role' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('speciální znaky v jménu — háčky', async ({ page }) => {
    const id = await createResidentApi(page, { firstName: 'Žaneta', lastName: 'Dvořáková-Šťastná', role: 'owner' });
    expect(id).toBeTruthy();

    const token = await getToken(page);
    const res = await page.request.get(`${API_URL}/api/v1/residents/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    const body = await res.json();
    expect(body.firstName).toBe('Žaneta');
    expect(body.lastName).toBe('Dvořáková-Šťastná');

    await deleteResidentApi(page, id);
  });

  test('bydlící bez emailu a telefonu — povoleno', async ({ page }) => {
    const id = await createResidentApi(page, { firstName: 'Bez', lastName: 'Kontaktu', role: 'contact' });
    expect(id).toBeTruthy();
    await deleteResidentApi(page, id);
  });
});

// ================================================================
// SECTION 2 — RELACE
// ================================================================
test.describe('Residents — Relace', () => {
  let propertyId: string;
  let unitId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page);
    propertyId = await createPropertyApi(page, 'Residents Relace E2E');
    unitId = await createUnitApi(page, propertyId, 'Byt pro relaci R');
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

  test('přiřazení k nemovitosti a jednotce via API', async ({ page }) => {
    const id = await createResidentApi(page, {
      firstName: 'Relace', lastName: 'Bydlící', role: 'tenant',
      propertyId, unitId,
    });
    expect(id).toBeTruthy();

    // Verify via API
    const token = await getToken(page);
    const res = await page.request.get(`${API_URL}/api/v1/residents/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    const body = await res.json();
    expect(body.propertyId).toBe(propertyId);
    expect(body.unitId).toBe(unitId);

    await deleteResidentApi(page, id);
  });

  test('bydlící bez jednotky — povoleno', async ({ page }) => {
    const id = await createResidentApi(page, {
      firstName: 'Bez', lastName: 'Jednotky', role: 'owner',
      propertyId, // No unitId
    });
    expect(id).toBeTruthy();
    await deleteResidentApi(page, id);
  });

  test('dva bydlící ve stejné jednotce', async ({ page }) => {
    const id1 = await createResidentApi(page, { firstName: 'Soused', lastName: 'Jedna', role: 'owner', propertyId, unitId });
    const id2 = await createResidentApi(page, { firstName: 'Soused', lastName: 'Dva', role: 'tenant', propertyId, unitId });

    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();

    await deleteResidentApi(page, id1);
    await deleteResidentApi(page, id2);
  });

  test('formulář — select nemovitostí zobrazí existující', async ({ page }) => {
    await page.goto('/residents');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="resident-add-btn"]').click();
    await page.waitForTimeout(300);

    const propSelect = page.locator('[data-testid="resident-form-property"]');
    await expect(propSelect).toBeVisible();

    // Should have at least 2 options (-- Vyberte -- + at least 1 property)
    const optCount = await propSelect.locator('option').count();
    expect(optCount).toBeGreaterThanOrEqual(2);

    await page.locator('[data-testid="resident-form-cancel"]').click();
  });
});

// ================================================================
// SECTION 3 — EDGE CASES
// ================================================================
test.describe('Residents — Edge Cases', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('smazání bydlícího — API vrací úspěch', async ({ page }) => {
    const id = await createResidentApi(page, { firstName: 'Smazat', lastName: 'Mě', role: 'contact' });
    const token = await getToken(page);
    const res = await page.request.delete(`${API_URL}/api/v1/residents/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status()).toBeLessThan(300);
  });
});

// ================================================================
// CLEANUP
// ================================================================
test.describe('Residents Deep — Cleanup', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('úklid', async ({ page }) => {
    const token = await getToken(page);
    for (const name of ['Relace', 'Bez', 'Soused', 'Smazat', 'Žaneta', 'Email', 'Role']) {
      const res = await page.request.get(`${API_URL}/api/v1/residents?search=${encodeURIComponent(name)}&limit=50`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok()) {
        const data = await res.json();
        for (const r of data.data ?? []) {
          if (['Relace', 'Bez', 'Soused', 'Smazat', 'Žaneta', 'Email', 'Role'].includes(r.firstName)) {
            await page.request.delete(`${API_URL}/api/v1/residents/${r.id}`, { headers: { Authorization: `Bearer ${token}` } });
          }
        }
      }
    }

    // Clean test properties
    const propRes = await page.request.get(`${API_URL}/api/v1/properties`, { headers: { Authorization: `Bearer ${token}` } });
    if (propRes.ok()) {
      for (const p of await propRes.json()) {
        if (p.name === 'Residents Relace E2E') {
          await page.request.delete(`${API_URL}/api/v1/properties/${p.id}`, { headers: { Authorization: `Bearer ${token}` } });
        }
      }
    }
  });
});
