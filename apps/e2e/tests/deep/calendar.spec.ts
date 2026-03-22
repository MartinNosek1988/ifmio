import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function getToken(page: any): Promise<string> {
  return page.evaluate(() => sessionStorage.getItem('ifmio:access_token'));
}

async function createEventApi(page: any, data: Record<string, unknown>): Promise<string> {
  const token = await getToken(page);
  const res = await page.request.post(`${API_URL}/api/v1/calendar/events`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: { title: 'Test Event', eventType: 'ostatni', date: new Date().toISOString().slice(0, 10), ...data },
  });
  return (await res.json()).id;
}

async function deleteEventApi(page: any, id: string) {
  const token = await getToken(page);
  await page.request.delete(`${API_URL}/api/v1/calendar/events/${id}`, { headers: { Authorization: `Bearer ${token}` } });
}

// ================================================================
// L1: LIST + CREATE
// ================================================================
test.describe('Calendar — CRUD', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('stránka se načte', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="calendar-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="calendar-add-btn"]')).toBeVisible();
  });

  test('formulář obsahuje klíčová pole', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="calendar-add-btn"]').click();
    await page.waitForTimeout(300);

    await expect(page.locator('[data-testid="calendar-form-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="calendar-form-save"]')).toBeVisible();
    await expect(page.locator('[data-testid="calendar-form-cancel"]')).toBeVisible();
    await expect(page.locator('[data-testid="calendar-form-save"]')).toBeEnabled();

    await page.locator('[data-testid="calendar-form-cancel"]').click();
  });

  test('validace — název je povinný', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="calendar-add-btn"]').click();

    await page.locator('[data-testid="calendar-form-title"]').fill('');
    await page.locator('[data-testid="calendar-form-save"]').click();

    await expect(page.locator('[data-testid="calendar-form-error-title"]')).toBeVisible();
    await page.locator('[data-testid="calendar-form-cancel"]').click();
  });

  test('vytvoření události via UI', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="calendar-add-btn"]').click();

    await page.locator('[data-testid="calendar-form-title"]').fill('Testovací Událost E2E');

    const responsePromise = page.waitForResponse(
      (r: any) => r.url().includes('/api/v1/calendar/events') && r.request().method() === 'POST',
    );
    await page.locator('[data-testid="calendar-form-save"]').click();
    await responsePromise;

    await expect(page.locator('[data-testid="calendar-form-title"]')).not.toBeVisible({ timeout: 5000 });
  });

  test('vytvoření události via API', async ({ page }) => {
    const id = await createEventApi(page, { title: 'API Event E2E', eventType: 'schuze' });
    expect(id).toBeTruthy();
    await deleteEventApi(page, id);
  });
});

// ================================================================
// L2: VALIDATION + EDGE CASES
// ================================================================
test.describe('Calendar — Deep', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('datum v minulosti — povoleno', async ({ page }) => {
    const pastDate = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
    const id = await createEventApi(page, { title: 'Past Event E2E', date: pastDate });
    expect(id).toBeTruthy();
    await deleteEventApi(page, id);
  });

  test('speciální znaky v názvu', async ({ page }) => {
    const id = await createEventApi(page, { title: 'Schůze č. 42/A — Žižkov (1. NP)' });
    expect(id).toBeTruthy();
    const token = await getToken(page);
    const res = await page.request.get(`${API_URL}/api/v1/calendar/events/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    expect((await res.json()).title).toBe('Schůze č. 42/A — Žižkov (1. NP)');
    await deleteEventApi(page, id);
  });

  test('všechny eventType options', async ({ page }) => {
    const types = ['schuze', 'revize', 'udrzba', 'predani', 'prohlidka', 'ostatni'];
    for (const eventType of types) {
      const id = await createEventApi(page, { title: `Type ${eventType} E2E`, eventType });
      expect(id).toBeTruthy();
      await deleteEventApi(page, id);
    }
  });

  test('událost bez přiřazení nemovitosti', async ({ page }) => {
    const id = await createEventApi(page, { title: 'No Property Event E2E' });
    expect(id).toBeTruthy();
    const token = await getToken(page);
    const res = await page.request.get(`${API_URL}/api/v1/calendar/events/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    expect((await res.json()).propertyId).toBeFalsy();
    await deleteEventApi(page, id);
  });

  test('dvě události ve stejný den', async ({ page }) => {
    const today = new Date().toISOString().slice(0, 10);
    const id1 = await createEventApi(page, { title: 'Same Day 1 E2E', date: today });
    const id2 = await createEventApi(page, { title: 'Same Day 2 E2E', date: today });
    expect(id1).not.toBe(id2);
    await deleteEventApi(page, id1);
    await deleteEventApi(page, id2);
  });

  test('smazání události via API', async ({ page }) => {
    const id = await createEventApi(page, { title: 'Delete Event E2E' });
    const token = await getToken(page);
    const res = await page.request.delete(`${API_URL}/api/v1/calendar/events/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status()).toBeLessThan(300);
  });
});

// ================================================================
// CLEANUP
// ================================================================
test.describe('Calendar — Cleanup', () => {
  test.beforeEach(async ({ page }) => { await login(page); });
  test('úklid', async ({ page }) => {
    const token = await getToken(page);
    const now = new Date();
    const from = new Date(now.getTime() - 90 * 86_400_000).toISOString();
    const to = new Date(now.getTime() + 90 * 86_400_000).toISOString();
    const res = await page.request.get(`${API_URL}/api/v1/calendar/events?from=${from}&to=${to}&search=E2E`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok()) {
      const events = await res.json();
      for (const e of (Array.isArray(events) ? events : events.data ?? [])) {
        if (e.title?.includes('E2E')) {
          await page.request.delete(`${API_URL}/api/v1/calendar/events/${e.id}`, { headers: { Authorization: `Bearer ${token}` } });
        }
      }
    }
  });
});
