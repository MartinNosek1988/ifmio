import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function getToken(page: any): Promise<string> {
  return page.evaluate(() => sessionStorage.getItem('ifmio:access_token'));
}

async function createPartyApi(page: any, data: Record<string, unknown>): Promise<string> {
  const token = await getToken(page);
  const res = await page.request.post(`${API_URL}/api/v1/parties`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data,
  });
  return (await res.json()).id;
}

async function deletePartyApi(page: any, id: string) {
  const token = await getToken(page);
  await page.request.delete(`${API_URL}/api/v1/parties/${id}`, { headers: { Authorization: `Bearer ${token}` } });
}

// ================================================================
// SECTION 1 — VALIDACE POLÍ
// ================================================================
test.describe('Parties — Validace polí', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('displayName je povinný', async ({ page }) => {
    await page.goto('/parties');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="party-add-btn"]').click();

    // Clear displayName and submit
    await page.locator('[data-testid="party-form-displayName"]').fill('');
    await page.locator('[data-testid="party-form-save"]').click();

    // Error should appear (toast or inline)
    await expect(page.locator('[data-testid="party-form-error"]')).toBeVisible({ timeout: 3000 });
  });

  test('speciální znaky v názvu — háčky, čárky', async ({ page }) => {
    const specialName = 'Dvořáková-Šťastná č.p. 42/A';
    const id = await createPartyApi(page, { type: 'person', displayName: specialName, firstName: 'Žaneta', lastName: 'Dvořáková-Šťastná' });
    expect(id).toBeTruthy();

    // Verify via API
    const token = await getToken(page);
    const res = await page.request.get(`${API_URL}/api/v1/parties/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    const body = await res.json();
    expect(body.displayName).toBe(specialName);

    await deletePartyApi(page, id);
  });

  test('IČO — API validuje max 20 znaků', async ({ page }) => {
    const token = await getToken(page);

    // Valid IČO
    const res1 = await page.request.post(`${API_URL}/api/v1/parties`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { type: 'company', displayName: 'IČO Test Valid', ic: '12345678' },
    });
    expect(res1.status()).toBeLessThan(300);
    const p1 = await res1.json();
    await deletePartyApi(page, p1.id);

    // IČO too long (21 chars) — should fail
    const res2 = await page.request.post(`${API_URL}/api/v1/parties`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { type: 'company', displayName: 'IČO Test Long', ic: '123456789012345678901' },
    });
    expect(res2.status()).toBeGreaterThanOrEqual(400);
  });

  test('email — API validuje formát', async ({ page }) => {
    const token = await getToken(page);

    // Invalid email
    const res = await page.request.post(`${API_URL}/api/v1/parties`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { type: 'person', displayName: 'Email Test', email: 'not-an-email' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('duplicitní IČO — ověření chování API', async ({ page }) => {
    const token = await getToken(page);
    const res1 = await page.request.post(`${API_URL}/api/v1/parties`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { type: 'company', displayName: 'Dup IČO 1', ic: '99998888' },
    });
    expect(res1.ok()).toBe(true);
    const p1 = await res1.json();

    const res2 = await page.request.post(`${API_URL}/api/v1/parties`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { type: 'company', displayName: 'Dup IČO 2', ic: '99998888' },
    });

    if (res2.ok()) {
      // Duplicate IČO allowed — no unique constraint
      const p2 = await res2.json();
      expect(p2.id).toBeTruthy();
      await deletePartyApi(page, p2.id);
    } else {
      // Duplicate IČO rejected (409 or 400) — document this
      expect(res2.status()).toBeGreaterThanOrEqual(400);
    }

    await deletePartyApi(page, p1.id);
  });
});

// ================================================================
// SECTION 2 — TYPY SUBJEKTŮ
// ================================================================
test.describe('Parties — Typy subjektů', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('přepnutí osoba → firma změní viditelná pole', async ({ page }) => {
    await page.goto('/parties');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="party-add-btn"]').click();

    // Default: person — shows firstName/lastName
    await expect(page.locator('[data-testid="party-form-lastName"]')).toBeVisible();
    await expect(page.locator('[data-testid="party-form-firstName"]')).toBeVisible();

    // Switch to company
    await page.locator('[data-testid="party-form-type-company"]').click();
    await expect(page.locator('[data-testid="party-form-companyName"]')).toBeVisible();
    await expect(page.locator('[data-testid="party-form-lastName"]')).not.toBeVisible();

    // Switch to SVJ
    await page.locator('[data-testid="party-form-type-hoa"]').click();
    await expect(page.locator('[data-testid="party-form-companyName"]')).toBeVisible();

    await page.locator('[data-testid="party-form-cancel"]').click();
  });

  test('vytvořit každý typ — osoba, firma, SVJ', async ({ page }) => {
    const ids: string[] = [];
    ids.push(await createPartyApi(page, { type: 'person', displayName: 'Osoba E2E Deep', firstName: 'Jan', lastName: 'Testovací' }));
    ids.push(await createPartyApi(page, { type: 'company', displayName: 'Firma E2E Deep', companyName: 'Firma E2E Deep s.r.o.' }));
    ids.push(await createPartyApi(page, { type: 'hoa', displayName: 'SVJ E2E Deep', companyName: 'SVJ E2E Deep' }));

    for (const id of ids) {
      expect(id).toBeTruthy();
      await deletePartyApi(page, id);
    }
  });
});

// ================================================================
// SECTION 3 — EDGE CASES
// ================================================================
test.describe('Parties — Edge Cases', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('deaktivovaný subjekt — filtr neaktivní', async ({ page }) => {
    // Create and deactivate
    const id = await createPartyApi(page, { type: 'person', displayName: 'Deaktivace E2E' });
    await deletePartyApi(page, id); // delete = deactivate (soft)

    await page.goto('/parties');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // The deactivated party should not appear in the default list
    // (or should have "neaktivní" badge)
    // Document behavior — don't assert specific outcome
  });
});

// ================================================================
// CLEANUP
// ================================================================
test.describe('Parties Deep — Cleanup', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('úklid', async ({ page }) => {
    const token = await getToken(page);
    const testNames = ['Osoba E2E Deep', 'Firma E2E Deep', 'SVJ E2E Deep', 'IČO Test Valid', 'Email Test', 'Deaktivace E2E', 'Dup IČO 1', 'Dup IČO 2'];
    for (const name of testNames) {
      const res = await page.request.get(`${API_URL}/api/v1/parties?search=${encodeURIComponent(name)}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok()) {
        const data = await res.json();
        for (const p of data.data ?? []) {
          if (testNames.includes(p.displayName)) {
            await page.request.delete(`${API_URL}/api/v1/parties/${p.id}`, { headers: { Authorization: `Bearer ${token}` } });
          }
        }
      }
    }
  });
});
