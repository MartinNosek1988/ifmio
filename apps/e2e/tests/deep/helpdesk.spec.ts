import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function getToken(page: any): Promise<string> {
  return page.evaluate(() => sessionStorage.getItem('ifmio:access_token'));
}

async function createTicketApi(page: any, data: Record<string, unknown>): Promise<string> {
  const token = await getToken(page);
  const res = await page.request.post(`${API_URL}/api/v1/helpdesk`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: { title: 'Test Ticket', priority: 'medium', category: 'general', ...data },
  });
  return (await res.json()).id;
}

async function deleteTicketApi(page: any, id: string) {
  const token = await getToken(page);
  await page.request.delete(`${API_URL}/api/v1/helpdesk/${id}`, { headers: { Authorization: `Bearer ${token}` } });
}

// ================================================================
// L1: LIST + CREATE
// ================================================================
test.describe('Helpdesk — CRUD', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('stránka se načte', async ({ page }) => {
    await page.goto('/helpdesk');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="ticket-list-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="ticket-add-btn"]')).toBeVisible();
  });

  test('formulář obsahuje klíčová pole', async ({ page }) => {
    await page.goto('/helpdesk');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="ticket-add-btn"]').click();
    await page.waitForTimeout(300);

    await expect(page.locator('[data-testid="ticket-form-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="ticket-form-category"]')).toBeVisible();
    await expect(page.locator('[data-testid="ticket-form-priority"]')).toBeVisible();
    await expect(page.locator('[data-testid="ticket-form-save"]')).toBeVisible();
    await expect(page.locator('[data-testid="ticket-form-cancel"]')).toBeVisible();
    await expect(page.locator('[data-testid="ticket-form-save"]')).toBeEnabled();

    await page.locator('[data-testid="ticket-form-cancel"]').click();
  });

  test('validace — název je povinný', async ({ page }) => {
    await page.goto('/helpdesk');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="ticket-add-btn"]').click();

    await page.locator('[data-testid="ticket-form-title"]').fill('');
    await page.locator('[data-testid="ticket-form-save"]').click();

    await expect(page.locator('[data-testid="ticket-form-error-title"]')).toBeVisible();
    await page.locator('[data-testid="ticket-form-cancel"]').click();
  });

  test('vytvoření ticketu', async ({ page }) => {
    await page.goto('/helpdesk');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="ticket-add-btn"]').click();

    await page.locator('[data-testid="ticket-form-title"]').fill('Testovací Ticket E2E');
    await page.locator('[data-testid="ticket-form-category"]').selectOption('plumbing');
    await page.locator('[data-testid="ticket-form-priority"]').selectOption('high');

    const responsePromise = page.waitForResponse(
      (r: any) => r.url().includes('/api/v1/helpdesk') && r.request().method() === 'POST',
    );
    await page.locator('[data-testid="ticket-form-save"]').click();
    await responsePromise;

    await expect(page.locator('[data-testid="ticket-form-title"]')).not.toBeVisible({ timeout: 5000 });
  });
});

// ================================================================
// L2: VALIDATION + WORKFLOW
// ================================================================
test.describe('Helpdesk — Deep', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('ticket bez přiřazení — povoleno', async ({ page }) => {
    const id = await createTicketApi(page, { title: 'Ticket No Property E2E' });
    expect(id).toBeTruthy();
    await deleteTicketApi(page, id);
  });

  test('speciální znaky v názvu', async ({ page }) => {
    const id = await createTicketApi(page, { title: 'Požadavek č. 42/A — Žižkov (1. NP)' });
    expect(id).toBeTruthy();
    const token = await getToken(page);
    const res = await page.request.get(`${API_URL}/api/v1/helpdesk/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    const body = await res.json();
    expect(body.title).toBe('Požadavek č. 42/A — Žižkov (1. NP)');
    await deleteTicketApi(page, id);
  });

  test('workflow — open → in_progress → resolved via API', async ({ page }) => {
    const id = await createTicketApi(page, { title: 'Workflow Ticket E2E' });
    const token = await getToken(page);

    // open → in_progress
    await page.request.put(`${API_URL}/api/v1/helpdesk/${id}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { status: 'in_progress' },
    });
    let res = await page.request.get(`${API_URL}/api/v1/helpdesk/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    expect((await res.json()).status).toBe('in_progress');

    // in_progress → resolved
    await page.request.put(`${API_URL}/api/v1/helpdesk/${id}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { status: 'resolved' },
    });
    res = await page.request.get(`${API_URL}/api/v1/helpdesk/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    expect((await res.json()).status).toBe('resolved');

    await deleteTicketApi(page, id);
  });

  test('duplicitní název — povoleno', async ({ page }) => {
    const id1 = await createTicketApi(page, { title: 'Dup Ticket E2E' });
    const id2 = await createTicketApi(page, { title: 'Dup Ticket E2E' });
    expect(id1).not.toBe(id2);
    await deleteTicketApi(page, id1);
    await deleteTicketApi(page, id2);
  });

  test('smazání ticketu via API', async ({ page }) => {
    const id = await createTicketApi(page, { title: 'Delete Ticket E2E' });
    const token = await getToken(page);
    const res = await page.request.delete(`${API_URL}/api/v1/helpdesk/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status()).toBeLessThan(300);
  });
});

// ================================================================
// CLEANUP
// ================================================================
test.describe('Helpdesk — Cleanup', () => {
  test.beforeEach(async ({ page }) => { await login(page); });
  test('úklid', async ({ page }) => {
    const token = await getToken(page);
    const res = await page.request.get(`${API_URL}/api/v1/helpdesk?search=E2E&limit=50`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok()) {
      const data = await res.json();
      for (const t of data.data ?? []) {
        if (t.title?.includes('E2E')) {
          await page.request.delete(`${API_URL}/api/v1/helpdesk/${t.id}`, { headers: { Authorization: `Bearer ${token}` } });
        }
      }
    }
  });
});
