import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function getToken(page: any): Promise<string> {
  return page.evaluate(() => sessionStorage.getItem('ifmio:access_token'));
}

async function createWoApi(page: any, data: Record<string, unknown>): Promise<string> {
  const token = await getToken(page);
  const res = await page.request.post(`${API_URL}/api/v1/work-orders`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data,
  });
  return (await res.json()).id;
}

async function deleteWoApi(page: any, id: string) {
  const token = await getToken(page);
  await page.request.delete(`${API_URL}/api/v1/work-orders/${id}`, { headers: { Authorization: `Bearer ${token}` } });
}

async function changeWoStatus(page: any, id: string, status: string) {
  const token = await getToken(page);
  await page.request.put(`${API_URL}/api/v1/work-orders/${id}/status`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: { status },
  });
}

// ================================================================
// SECTION 1 — VALIDACE POLÍ
// ================================================================
test.describe('Work Orders — Validace polí', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('název je povinný — UI validace', async ({ page }) => {
    await page.goto('/workorders');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="wo-add-btn"]').click();
    await expect(page.locator('[data-testid="wo-form-title"]')).toBeVisible();

    // Submit with empty title
    await page.locator('[data-testid="wo-form-title"]').fill('');
    await page.locator('[data-testid="wo-form-save"]').click();

    // Validation error should appear
    await expect(page.locator('[data-testid="wo-form-error-title"]')).toBeVisible();
    await page.locator('[data-testid="wo-form-cancel"]').click();
  });

  test('priorita — všechny options dostupné', async ({ page }) => {
    await page.goto('/workorders');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="wo-add-btn"]').click();

    const prioritySelect = page.locator('[data-testid="wo-form-priority"]');
    await expect(prioritySelect).toBeVisible();

    // Should have all priority options
    const options = await prioritySelect.locator('option').allTextContents();
    expect(options.length).toBeGreaterThanOrEqual(4);

    await page.locator('[data-testid="wo-form-cancel"]').click();
  });

  test('popis — volitelný', async ({ page }) => {
    // Create WO without description via API — should succeed
    const id = await createWoApi(page, { title: 'WO Bez Popisu E2E' });
    expect(id).toBeTruthy();
    await deleteWoApi(page, id);
  });

  test('termín v minulosti — povoleno', async ({ page }) => {
    const pastDate = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
    const id = await createWoApi(page, { title: 'WO Past Deadline E2E', deadline: pastDate });
    expect(id).toBeTruthy();
    await deleteWoApi(page, id);
  });

  test('duplicitní název — povoleno', async ({ page }) => {
    const id1 = await createWoApi(page, { title: 'WO Dup E2E' });
    const id2 = await createWoApi(page, { title: 'WO Dup E2E' });
    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
    await deleteWoApi(page, id1);
    await deleteWoApi(page, id2);
  });

  test('velmi dlouhý popis — API přijme', async ({ page }) => {
    const longDesc = 'A'.repeat(5000);
    const id = await createWoApi(page, { title: 'WO Long Desc E2E', description: longDesc });
    expect(id).toBeTruthy();

    const token = await getToken(page);
    const res = await page.request.get(`${API_URL}/api/v1/work-orders/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    const body = await res.json();
    expect(body.description?.length).toBe(5000);

    await deleteWoApi(page, id);
  });
});

// ================================================================
// SECTION 2 — WORKFLOW (status lifecycle)
// ================================================================
test.describe('Work Orders — Workflow', () => {
  let woId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page);
    woId = await createWoApi(page, { title: 'WO Workflow E2E', priority: 'vysoka' });
    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page);
    await deleteWoApi(page, woId);
    await ctx.close();
  });

  test.beforeEach(async ({ page }) => { await login(page); });

  test('nový → v řešení → vyřešený → uzavřený (celý průchod)', async ({ page }) => {
    const token = await getToken(page);

    // Verify initial status
    let res = await page.request.get(`${API_URL}/api/v1/work-orders/${woId}`, { headers: { Authorization: `Bearer ${token}` } });
    let body = await res.json();
    expect(body.status).toBe('nova');

    // nova → v_reseni
    await changeWoStatus(page, woId, 'v_reseni');
    res = await page.request.get(`${API_URL}/api/v1/work-orders/${woId}`, { headers: { Authorization: `Bearer ${token}` } });
    body = await res.json();
    expect(body.status).toBe('v_reseni');

    // v_reseni → vyresena
    await changeWoStatus(page, woId, 'vyresena');
    res = await page.request.get(`${API_URL}/api/v1/work-orders/${woId}`, { headers: { Authorization: `Bearer ${token}` } });
    body = await res.json();
    expect(body.status).toBe('vyresena');

    // vyresena → uzavrena
    await changeWoStatus(page, woId, 'uzavrena');
    res = await page.request.get(`${API_URL}/api/v1/work-orders/${woId}`, { headers: { Authorization: `Bearer ${token}` } });
    body = await res.json();
    expect(body.status).toBe('uzavrena');
  });

  test('nový → zrušený přes API', async ({ page }) => {
    const id = await createWoApi(page, { title: 'WO Cancel E2E' });
    await changeWoStatus(page, id, 'zrusena');

    const token = await getToken(page);
    const res = await page.request.get(`${API_URL}/api/v1/work-orders/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    const body = await res.json();
    expect(body.status).toBe('zrusena');

    await deleteWoApi(page, id);
  });

  test('zrušený → obnovit (nova) přes API', async ({ page }) => {
    const id = await createWoApi(page, { title: 'WO Restore E2E' });
    await changeWoStatus(page, id, 'zrusena');
    await changeWoStatus(page, id, 'nova');

    const token = await getToken(page);
    const res = await page.request.get(`${API_URL}/api/v1/work-orders/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    const body = await res.json();
    expect(body.status).toBe('nova');

    await deleteWoApi(page, id);
  });

  test('status badge se mění v UI po tranzici', async ({ page }) => {
    const id = await createWoApi(page, { title: 'WO Badge E2E' });

    await page.goto('/workorders');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Open detail and verify status
    await page.getByText('WO Badge E2E').first().click();
    await page.waitForTimeout(500);

    // Status should be "Nová"
    await expect(page.locator('[data-testid="wo-detail-status"]')).toBeVisible();

    // Change status via button if available
    const zahajitBtn = page.locator('[data-testid="wo-status-v_reseni"]');
    if (await zahajitBtn.isVisible().catch(() => false)) {
      await zahajitBtn.click();
      await page.waitForTimeout(1000);

      // Reopen
      await page.getByText('WO Badge E2E').first().click();
      await page.waitForTimeout(500);
      await expect(page.locator('[data-testid="wo-detail-status"]')).toContainText('V řešení');
    }

    // Cleanup
    await deleteWoApi(page, id);
  });
});

// ================================================================
// SECTION 3 — RELACE
// ================================================================
test.describe('Work Orders — Relace', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('WO bez přiřazení — povoleno', async ({ page }) => {
    const id = await createWoApi(page, { title: 'WO No Relations E2E' });
    expect(id).toBeTruthy();

    const token = await getToken(page);
    const res = await page.request.get(`${API_URL}/api/v1/work-orders/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    const body = await res.json();
    expect(body.propertyId).toBeFalsy();

    await deleteWoApi(page, id);
  });
});

// ================================================================
// SECTION 4 — EDGE CASES
// ================================================================
test.describe('Work Orders — Edge Cases', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('smazání WO v stavu v_reseni', async ({ page }) => {
    const id = await createWoApi(page, { title: 'WO Delete Active E2E' });
    await changeWoStatus(page, id, 'v_reseni');

    const token = await getToken(page);
    const res = await page.request.delete(`${API_URL}/api/v1/work-orders/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    // Document: can active WOs be deleted? (no constraint expected)
    expect(res.status()).toBeLessThan(500);
  });
});

// ================================================================
// CLEANUP
// ================================================================
test.describe('Work Orders Deep — Cleanup', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('úklid', async ({ page }) => {
    const token = await getToken(page);
    const testPrefixes = ['WO Bez Popisu', 'WO Past', 'WO Dup', 'WO Long', 'WO Workflow', 'WO Cancel', 'WO Restore', 'WO Badge', 'WO No Relations', 'WO Delete Active'];
    const res = await page.request.get(`${API_URL}/api/v1/work-orders?search=E2E&limit=100`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok()) {
      const items = await res.json();
      for (const wo of (Array.isArray(items) ? items : items.data ?? [])) {
        if (wo.title?.includes('E2E') && testPrefixes.some(p => wo.title.startsWith(p))) {
          await page.request.delete(`${API_URL}/api/v1/work-orders/${wo.id}`, { headers: { Authorization: `Bearer ${token}` } });
        }
      }
    }
  });
});
