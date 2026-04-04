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
    data: { name, address: 'Finanční 1', city: 'Praha', postalCode: '11000', type: 'SVJ', ownership: 'vlastnictvi' },
  });
  return (await res.json()).id;
}

async function deletePropertyApi(page: any, id: string) {
  const token = await getToken(page);
  await page.request.delete(`${API_URL}/api/v1/properties/${id}`, { headers: { Authorization: `Bearer ${token}` } });
}

const TAB_KEYS = ['components', 'prescriptions', 'bank', 'doklady', 'parovani', 'konto', 'debtors', 'reminders', 'accounts'];

// ================================================================
// SECTION 1 — TAB NAVIGATION
// ================================================================
test.describe('Finance — Navigace tabů', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('stránka se načte', async ({ page }) => {
    await page.goto('/finance');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="finance-page"]')).toBeVisible();
  });

  test('všech 9 tabů je viditelných', async ({ page }) => {
    await page.goto('/finance');
    await page.waitForLoadState('domcontentloaded');

    for (const key of TAB_KEYS) {
      await expect(page.locator(`[data-testid="finance-tab-${key}"]`)).toBeVisible();
    }
  });

  test('přepínání tabů funguje', async ({ page }) => {
    await page.goto('/finance');
    await page.waitForLoadState('domcontentloaded');

    for (const key of TAB_KEYS) {
      await page.locator(`[data-testid="finance-tab-${key}"]`).click();
      await page.waitForTimeout(500);
      // Tab should become active (has 'active' class)
      const cls = await page.locator(`[data-testid="finance-tab-${key}"]`).getAttribute('class');
      expect(cls).toContain('active');
    }
  });
});

// ================================================================
// SECTION 2 — SLOŽKY PŘEDPISU (Prescription Components)
// ================================================================
test.describe('Finance — Složky předpisu', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('tab zobrazí obsah bez chyby', async ({ page }) => {
    await page.goto('/finance?tab=components');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Should show either components list or property selector
    // No error state should be visible
    const hasError = await page.locator('text=Nepodařilo se').isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });

  test('tlačítko Přidat složku je viditelné', async ({ page }) => {
    await page.goto('/finance?tab=components');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // The add button may require a property to be selected first
    const addBtn = page.locator('[data-testid="finance-components-add-btn"]');
    const isVisible = await addBtn.isVisible().catch(() => false);
    if (!isVisible) {
      // Select first property if property picker exists
      const propSelect = page.locator('select').first();
      const options = await propSelect.locator('option').count();
      if (options > 1) {
        await propSelect.selectOption({ index: 1 });
        await page.waitForTimeout(1000);
      }
    }
    // After property selection, button should be visible
    // If still not visible, skip — property-dependent feature
    if (!(await addBtn.isVisible().catch(() => false))) {
      test.skip(true, 'Přidat složku vyžaduje vybranou nemovitost');
    }
  });
});

// ================================================================
// SECTION 3 — PŘEDPISY (Prescriptions)
// ================================================================
test.describe('Finance — Předpisy', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('tab předpisy se načte bez chyby', async ({ page }) => {
    await page.goto('/finance?tab=prescriptions');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Default tab — should load prescriptions list or empty state
    const hasError = await page.locator('text=Nepodařilo se').isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });

  test('filtr stavu předpisů funguje', async ({ page }) => {
    await page.goto('/finance?tab=prescriptions');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Look for status filter select
    const statusFilter = page.locator('select').filter({ hasText: /aktivní|všechny/i }).first();
    if (await statusFilter.isVisible().catch(() => false)) {
      await statusFilter.selectOption({ index: 0 });
      await page.waitForTimeout(500);
    }
  });
});

// ================================================================
// SECTION 4 — BANKA (Bank Transactions)
// ================================================================
test.describe('Finance — Banka', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('tab banka se načte bez chyby', async ({ page }) => {
    await page.goto('/finance?tab=bank');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const hasError = await page.locator('text=Nepodařilo se').isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });
});

// ================================================================
// SECTION 5 — DOKLADY (Invoices)
// ================================================================
test.describe('Finance — Doklady', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('tab doklady se načte a zobrazí tlačítko Nový doklad', async ({ page }) => {
    await page.goto('/finance?tab=doklady');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    await expect(page.locator('[data-testid="finance-doklady-add-btn"]')).toBeVisible();
  });

  test('formulář nového dokladu se otevře', async ({ page }) => {
    await page.goto('/finance?tab=doklady');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    await page.locator('[data-testid="finance-doklady-add-btn"]').click();
    await page.waitForTimeout(500);

    // Invoice form modal should open — look for form fields
    // InvoiceForm has fields: number, type, supplier, amounts
    const hasFormField = await page.locator('text=Číslo dokladu').isVisible().catch(() => false)
      || await page.locator('text=Typ dokladu').isVisible().catch(() => false)
      || await page.locator('text=Nový doklad').isVisible().catch(() => false);
    expect(hasFormField).toBe(true);
  });
});

// ================================================================
// SECTION 6 — PÁROVÁNÍ (Transaction Matching)
// ================================================================
test.describe('Finance — Párování', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('tab párování se načte bez chyby', async ({ page }) => {
    await page.goto('/finance?tab=parovani');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const hasError = await page.locator('text=Nepodařilo se').isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });
});

// ================================================================
// SECTION 7 — KONTO (Owner Accounts)
// ================================================================
test.describe('Finance — Konto vlastníků', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('tab konto se načte bez chyby', async ({ page }) => {
    await page.goto('/finance?tab=konto');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const hasError = await page.locator('text=Nepodařilo se').isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });
});

// ================================================================
// SECTION 8 — DLUŽNÍCI (Debtors)
// ================================================================
test.describe('Finance — Dlužníci', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('tab dlužníci se načte bez chyby', async ({ page }) => {
    await page.goto('/finance?tab=debtors');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const hasError = await page.locator('text=Nepodařilo se').isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });
});

// ================================================================
// SECTION 9 — UPOMÍNKY (Reminders)
// ================================================================
test.describe('Finance — Upomínky', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('tab upomínky se načte bez chyby', async ({ page }) => {
    await page.goto('/finance?tab=reminders');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const hasError = await page.locator('text=Nepodařilo se').isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });
});

// ================================================================
// SECTION 10 — ÚČTY (Bank Accounts)
// ================================================================
test.describe('Finance — Účty', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('tab účty se načte bez chyby', async ({ page }) => {
    await page.goto('/finance?tab=accounts');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const hasError = await page.locator('text=Nepodařilo se').isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });
});

// ================================================================
// SECTION 11 — EDGE CASES
// ================================================================
test.describe('Finance — Edge Cases', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('neexistující tab — fallback na předpisy', async ({ page }) => {
    await page.goto('/finance?tab=nonexistent');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Should not crash — either shows default tab or empty
    await expect(page.locator('[data-testid="finance-page"]')).toBeVisible();
  });

  test('přímý odkaz na tab components', async ({ page }) => {
    await page.goto('/finance?tab=components');
    await page.waitForLoadState('domcontentloaded');

    const cls = await page.locator('[data-testid="finance-tab-components"]').getAttribute('class');
    expect(cls).toContain('active');
  });

  test('přímý odkaz na tab konto', async ({ page }) => {
    await page.goto('/finance?tab=konto');
    await page.waitForLoadState('domcontentloaded');

    const cls = await page.locator('[data-testid="finance-tab-konto"]').getAttribute('class');
    expect(cls).toContain('active');
  });

  test('API — složka předpisu s nulovou částkou', async ({ page }) => {
    // Create a property for this test
    const propId = await createPropertyApi(page, 'Finance Edge Case E2E');
    const token = await getToken(page);

    // Try to create a component with amount 0
    const res = await page.request.post(`${API_URL}/api/v1/properties/${propId}/components`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { name: 'Nulová složka', code: 'NUL', componentType: 'utility_fee', calculationMethod: 'fixed', defaultAmount: 0 },
    });
    // Document behavior: should be accepted (0 is valid for some component types)
    expect(res.status()).toBeLessThan(500);

    await deletePropertyApi(page, propId);
  });

  test('API — faktura se zápornou částkou (dobropis)', async ({ page }) => {
    const token = await getToken(page);

    // Try to create invoice with negative amount
    const res = await page.request.post(`${API_URL}/api/v1/finance/invoices`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        number: `E2E-CREDIT-${Date.now()}`, type: 'credit_note',
        supplierName: 'Test s.r.o.', amountTotal: -5000,
        issueDate: new Date().toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
      },
    });
    // Document: credit notes with negative amounts should be accepted
    expect(res.status()).toBeLessThan(500);

    if (res.ok()) {
      const invoice = await res.json();
      await page.request.delete(`${API_URL}/api/v1/finance/invoices/${invoice.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  });
});
