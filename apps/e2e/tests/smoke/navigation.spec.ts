import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

const SIDEBAR_MODULES = [
  'dashboard', 'helpdesk', 'workorders', 'properties', 'principals',
  'parties', 'residents', 'finance', 'documents', 'meters', 'calendar', 'settings',
];

test.describe('Navigace', () => {
  test('Všechny hlavní stránky se načtou bez chyby', async ({ page }) => {
    await login(page);

    for (const mod of SIDEBAR_MODULES) {
      const navItem = page.locator(`[data-testid="sidebar-nav-${mod}"]`);
      if (await navItem.isVisible().catch(() => false)) {
        await navItem.click();
        await page.waitForLoadState('networkidle');
        const hasError = await page.locator('text=Něco se pokazilo').isVisible().catch(() => false);
        expect(hasError, `Stránka /${mod} zobrazuje chybu`).toBe(false);
      }
    }
  });

  test('Navigace Properties → detail → zpět', async ({ page }) => {
    await login(page);
    await page.locator('[data-testid="sidebar-nav-properties"]').click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/properties/);

    const firstRow = page.locator('.tbl tbody tr').first();
    if (await firstRow.isVisible().catch(() => false)) {
      await firstRow.click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/properties\/[a-z0-9-]+/);
      await page.goBack();
      await expect(page).toHaveURL(/\/properties$/);
    }
  });

  test('Neautentizovaný uživatel je přesměrován na login', async ({ page }) => {
    await page.goto('/properties');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
