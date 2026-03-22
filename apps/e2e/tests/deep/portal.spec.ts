import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

// NOTE: Portal is client-facing — test user may not have portal access
// Tests verify page loads or graceful redirect

test.describe('Portal — Client View', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('stránka se načte nebo přesměruje', async ({ page }) => {
    await page.goto('/portal');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Portal page or redirect to dashboard (if user is not a client)
    const isPortal = await page.locator('[data-testid="portal-page"]').isVisible().catch(() => false);
    const isDashboard = page.url().includes('/dashboard');
    expect(isPortal || isDashboard).toBe(true);
  });

  test('portal units — stránka se načte', async ({ page }) => {
    await page.goto('/portal/units');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    // May redirect if not portal user
    const hasError500 = await page.locator('text=500').isVisible().catch(() => false);
    expect(hasError500).toBe(false);
  });
});
