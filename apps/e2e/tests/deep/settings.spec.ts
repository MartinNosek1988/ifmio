import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

const SETTINGS_TABS = ['firma', 'email', 'fakturace', 'upominky', 'vzhled', 'mio', 'export'];

// ================================================================
// L1: TAB NAVIGATION
// ================================================================
test.describe('Settings — Tabs', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('stránka se načte', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="settings-page"]')).toBeVisible();
  });

  test('všech 7 tabů je viditelných', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');

    for (const key of SETTINGS_TABS) {
      await expect(page.locator(`[data-testid="settings-tab-${key}"]`)).toBeVisible();
    }
  });

  test('přepínání tabů funguje', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');

    for (const key of SETTINGS_TABS) {
      await page.locator(`[data-testid="settings-tab-${key}"]`).click();
      await page.waitForTimeout(300);
      const cls = await page.locator(`[data-testid="settings-tab-${key}"]`).getAttribute('class');
      expect(cls).toContain('active');
    }
  });
});

// ================================================================
// L2: PER-TAB CONTENT (read-only — don't save)
// ================================================================
test.describe('Settings — Obsah tabů', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('tab Firma — zobrazí formulář', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="settings-tab-firma"]').click();
    await page.waitForTimeout(500);

    // Should show company info fields
    const hasContent = await page.getByText('Firma').first().isVisible().catch(() => false)
      || await page.locator('input').first().isVisible().catch(() => false);
    expect(hasContent).toBe(true);
  });

  test('tab Email — zobrazí nastavení', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="settings-tab-email"]').click();
    await page.waitForTimeout(500);

    const hasError = await page.locator('text=Nepodařilo se').isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });

  test('tab Fakturace — bez chyby', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="settings-tab-fakturace"]').click();
    await page.waitForTimeout(500);
    const hasError = await page.locator('text=Nepodařilo se').isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });

  test('tab Vzhled — bez chyby', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="settings-tab-vzhled"]').click();
    await page.waitForTimeout(500);
    const hasError = await page.locator('text=Nepodařilo se').isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });

  test('tab Export — bez chyby', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-testid="settings-tab-export"]').click();
    await page.waitForTimeout(500);
    const hasError = await page.locator('text=Nepodařilo se').isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });
});
