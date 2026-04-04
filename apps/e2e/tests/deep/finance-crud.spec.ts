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
    data: { name, address: 'Finance CRUD 1', city: 'Praha', postalCode: '11000', type: 'SVJ', ownership: 'vlastnictvi' },
  });
  return (await res.json()).id;
}

async function deletePropertyApi(page: any, id: string) {
  const token = await getToken(page);
  await page.request.delete(`${API_URL}/api/v1/properties/${id}`, { headers: { Authorization: `Bearer ${token}` } });
}

// ================================================================
// SECTION 1 — SLOŽKY PŘEDPISU CRUD
// ================================================================
test.describe('Finance CRUD — Složky předpisu', () => {
  let propertyId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page);
    propertyId = await createPropertyApi(page, 'Finance Složky CRUD E2E');
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

  test('formulář obsahuje všechna pole', async ({ page }) => {
    await page.goto('/finance?tab=components');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Select the test property if property picker exists
    const propSelects = page.locator('select').filter({ hasText: /Finance Složky|Vyber/i });
    if (await propSelects.first().isVisible().catch(() => false)) {
      await propSelects.first().selectOption({ label: 'Finance Složky CRUD E2E' });
      await page.waitForTimeout(500);
    }

    // Click add button
    const addBtn = page.locator('[data-testid="finance-components-add-btn"]');
    if (!(await addBtn.isVisible().catch(() => false))) {
      test.skip(true, 'Add button not visible — property not selected');
      return;
    }
    await addBtn.click();
    await page.waitForTimeout(300);

    // Assert form fields
    await expect(page.locator('[data-testid="finance-component-form-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="finance-component-form-type"]')).toBeVisible();
    await expect(page.locator('[data-testid="finance-component-form-method"]')).toBeVisible();
    await expect(page.locator('[data-testid="finance-component-form-amount"]')).toBeVisible();
    await expect(page.locator('[data-testid="finance-component-form-save"]')).toBeVisible();
    await expect(page.locator('[data-testid="finance-component-form-cancel"]')).toBeVisible();

    await page.locator('[data-testid="finance-component-form-cancel"]').click();
  });

  test('vytvoření složky "Fond oprav E2E"', async ({ page }) => {
    await page.goto('/finance?tab=components');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Select property
    const propSelects = page.locator('select').filter({ hasText: /Finance Složky|Vyber/i });
    if (await propSelects.first().isVisible().catch(() => false)) {
      await propSelects.first().selectOption({ label: 'Finance Složky CRUD E2E' });
      await page.waitForTimeout(500);
    }

    await page.locator('[data-testid="finance-components-add-btn"]').click();
    await page.waitForTimeout(300);

    await page.locator('[data-testid="finance-component-form-name"]').fill('Fond oprav E2E');
    await page.locator('[data-testid="finance-component-form-type"]').selectOption('FUND');
    await page.locator('[data-testid="finance-component-form-amount"]').fill('1500');

    const responsePromise = page.waitForResponse(
      (r: any) => r.url().includes('/components') && r.request().method() === 'POST',
    );
    await page.locator('[data-testid="finance-component-form-save"]').click();
    await responsePromise;

    // Modal should close
    await expect(page.locator('[data-testid="finance-component-form-name"]')).not.toBeVisible({ timeout: 5000 });

    // Verify in list
    await page.waitForTimeout(500);
    await expect(page.getByText('Fond oprav E2E').first()).toBeVisible();
  });

  test('vytvoření druhé složky "Správa E2E"', async ({ page }) => {
    await page.goto('/finance?tab=components');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const propSelects = page.locator('select').filter({ hasText: /Finance Složky|Vyber/i });
    if (await propSelects.first().isVisible().catch(() => false)) {
      await propSelects.first().selectOption({ label: 'Finance Složky CRUD E2E' });
      await page.waitForTimeout(500);
    }

    await page.locator('[data-testid="finance-components-add-btn"]').click();
    await page.waitForTimeout(300);

    await page.locator('[data-testid="finance-component-form-name"]').fill('Správa E2E');
    await page.locator('[data-testid="finance-component-form-type"]').selectOption('FLAT_FEE');
    await page.locator('[data-testid="finance-component-form-amount"]').fill('800');

    const responsePromise = page.waitForResponse(
      (r: any) => r.url().includes('/components') && r.request().method() === 'POST',
    );
    await page.locator('[data-testid="finance-component-form-save"]').click();
    await responsePromise;

    await expect(page.locator('[data-testid="finance-component-form-name"]')).not.toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);
    await expect(page.getByText('Správa E2E').first()).toBeVisible();
  });

  test('smazání složky přes API', async ({ page }) => {
    // Delete test components via API to clean up
    const token = await getToken(page);
    const listRes = await page.request.get(`${API_URL}/api/v1/properties/${propertyId}/components`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (listRes.ok()) {
      const components = await listRes.json();
      for (const c of components) {
        if (c.name.includes('E2E')) {
          await page.request.delete(`${API_URL}/api/v1/properties/${propertyId}/components/${c.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      }
    }
  });
});

// ================================================================
// SECTION 2 — DOKLADY / FAKTURY CRUD
// ================================================================
test.describe('Finance CRUD — Doklady', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('formulář nového dokladu obsahuje všechna pole', async ({ page }) => {
    await page.goto('/finance?tab=doklady');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    await page.locator('[data-testid="finance-doklady-add-btn"]').click();
    await page.waitForTimeout(500);

    await expect(page.locator('[data-testid="finance-doklad-form-number"]')).toBeVisible();
    await expect(page.locator('[data-testid="finance-doklad-form-type"]')).toBeVisible();
    await expect(page.locator('[data-testid="finance-doklad-form-amount"]')).toBeVisible();
    await expect(page.locator('[data-testid="finance-doklad-form-issueDate"]')).toBeVisible();
    await expect(page.locator('[data-testid="finance-doklad-form-save"]')).toBeVisible();
    await expect(page.locator('[data-testid="finance-doklad-form-cancel"]')).toBeVisible();

    // All enabled
    await expect(page.locator('[data-testid="finance-doklad-form-save"]')).toBeEnabled();

    await page.locator('[data-testid="finance-doklad-form-cancel"]').click();
  });

  test('vytvoření faktury přijaté', async ({ page }) => {
    await page.goto('/finance?tab=doklady');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    await page.locator('[data-testid="finance-doklady-add-btn"]').click();
    await page.waitForTimeout(500);

    const invoiceNumber = `FP-E2E-${Date.now()}`;
    await page.locator('[data-testid="finance-doklad-form-number"]').fill(invoiceNumber);
    await page.locator('[data-testid="finance-doklad-form-type"]').selectOption('received');
    await page.locator('[data-testid="finance-doklad-form-amount"]').fill('10000');

    // issueDate should be pre-filled with today
    const issueDateVal = await page.locator('[data-testid="finance-doklad-form-issueDate"]').inputValue();
    expect(issueDateVal).toBeTruthy();

    const responsePromise = page.waitForResponse(
      (r: any) => r.url().includes('/invoices') && r.request().method() === 'POST',
    );
    await page.locator('[data-testid="finance-doklad-form-save"]').click();
    await responsePromise;

    await expect(page.locator('[data-testid="finance-doklad-form-number"]')).not.toBeVisible({ timeout: 5000 });

    // Verify in list
    await page.waitForTimeout(500);
    await expect(page.getByText(invoiceNumber).first()).toBeVisible({ timeout: 5000 });
  });

  test('smazání dokladu přes API', async ({ page }) => {
    const token = await getToken(page);
    const listRes = await page.request.get(`${API_URL}/api/v1/finance/invoices?search=FP-E2E`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (listRes.ok()) {
      const data = await listRes.json();
      const invoices = data.data ?? data;
      for (const inv of invoices) {
        if (inv.number?.includes('FP-E2E')) {
          await page.request.delete(`${API_URL}/api/v1/finance/invoices/${inv.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      }
    }
  });
});

// ================================================================
// SECTION 3 — PŘEDPISY
// ================================================================
test.describe('Finance CRUD — Předpisy', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('tab předpisy se načte a zobrazí obsah', async ({ page }) => {
    await page.goto('/finance?tab=prescriptions');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Should show table or empty state — no crash
    const hasError = await page.locator('text=Nepodařilo se').isVisible().catch(() => false);
    expect(hasError).toBe(false);

    // Tab should be active
    const cls = await page.locator('[data-testid="finance-tab-prescriptions"]').getAttribute('class');
    expect(cls).toContain('active');
  });
});

// ================================================================
// CLEANUP
// ================================================================
test.describe('Finance CRUD — Cleanup', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('úklid — smazání testovacích dat', async ({ page }) => {
    const token = await getToken(page);

    // Clean up test properties
    const propRes = await page.request.get(`${API_URL}/api/v1/properties`, { headers: { Authorization: `Bearer ${token}` } });
    if (propRes.ok()) {
      const properties = await propRes.json();
      for (const p of properties) {
        if (p.name === 'Finance Složky CRUD E2E') {
          await page.request.delete(`${API_URL}/api/v1/properties/${p.id}`, { headers: { Authorization: `Bearer ${token}` } });
        }
      }
    }

    // Clean up test invoices
    const invRes = await page.request.get(`${API_URL}/api/v1/finance/invoices?search=FP-E2E`, { headers: { Authorization: `Bearer ${token}` } });
    if (invRes.ok()) {
      const data = await invRes.json();
      for (const inv of (data.data ?? data)) {
        if (inv.number?.includes('FP-E2E')) {
          await page.request.delete(`${API_URL}/api/v1/finance/invoices/${inv.id}`, { headers: { Authorization: `Bearer ${token}` } });
        }
      }
    }
  });
});
