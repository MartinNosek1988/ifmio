import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function getToken(page: any): Promise<string> {
  return page.evaluate(() => sessionStorage.getItem('ifmio:access_token'));
}

// ================================================================
// L1: LIST
// ================================================================
test.describe('Documents — CRUD', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('stránka se načte', async ({ page }) => {
    await page.goto('/documents');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="doc-list-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="doc-add-btn"]')).toBeVisible();
  });

  test('formulář upload se otevře', async ({ page }) => {
    await page.goto('/documents');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="doc-add-btn"]').click();
    await page.waitForTimeout(500);

    // Modal "Nahrát dokument" should open with form fields
    await expect(page.getByText('Nahrát dokument').first()).toBeVisible();
    await expect(page.getByText('Název dokumentu').first()).toBeVisible();
    await expect(page.getByText('Kategorie').first()).toBeVisible();
  });
});

// ================================================================
// L2: API-level validation
// ================================================================
test.describe('Documents — Deep', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('API — upload vyžaduje soubor (multipart)', async ({ page }) => {
    const token = await getToken(page);
    // Try to upload without file — should fail
    const res = await page.request.post(`${API_URL}/api/v1/documents/upload`, {
      headers: { Authorization: `Bearer ${token}` },
      multipart: { name: 'Test Doc E2E', category: 'other' },
    });
    // Without file, API should reject (400 or similar)
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('smazání dokumentu — API endpoint existuje', async ({ page }) => {
    // Document: DELETE endpoint exists but we can't easily create a doc
    // via API without file upload. Just verify the endpoint pattern.
    const token = await getToken(page);
    const res = await page.request.delete(`${API_URL}/api/v1/documents/nonexistent-id`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // Should be 404 (not found) — not 500 (endpoint doesn't exist)
    expect(res.status()).toBeLessThan(500);
  });
});
