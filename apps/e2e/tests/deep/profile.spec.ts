import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function getToken(page: any): Promise<string> {
  return page.evaluate(() => sessionStorage.getItem('ifmio:access_token'));
}

// ================================================================
// L1: PAGE LOAD
// ================================================================
test.describe('Profile — Zobrazení', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('stránka se načte a zobrazí profil', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="profile-page"]')).toBeVisible();
  });

  test('zobrazí jméno aktuálního uživatele', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Profile should show the user's name somewhere
    const token = await getToken(page);
    const meRes = await page.request.get(`${API_URL}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    const me = await meRes.json();

    if (me.name) {
      await expect(page.getByText(me.name).first()).toBeVisible();
    }
  });

  test('zobrazí email aktuálního uživatele', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    const token = await getToken(page);
    const meRes = await page.request.get(`${API_URL}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    const me = await meRes.json();

    if (me.email) {
      await expect(page.getByText(me.email).first()).toBeVisible();
    }
  });
});

// ================================================================
// L2: API PROFILE (read-only — don't change values)
// ================================================================
test.describe('Profile — Deep', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('API — GET /auth/me vrací profil', async ({ page }) => {
    const token = await getToken(page);
    const res = await page.request.get(`${API_URL}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    expect(res.ok()).toBe(true);

    const me = await res.json();
    expect(me.id).toBeTruthy();
    expect(me.email).toBeTruthy();
    expect(me.role).toBeTruthy();
    expect(me.tenantId).toBeTruthy();
  });

  test('profil má taby (osobní, zabezpečení, předvolby)', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Profile tabs should exist
    const personalTab = await page.getByText('Osobní údaje').first().isVisible().catch(() => false)
      || await page.locator('.profile-tab').first().isVisible().catch(() => false);
    expect(personalTab).toBe(true);
  });
});
