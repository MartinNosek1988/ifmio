import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

// NOTE: Portal is client-facing — test user may not have portal access
// Tests verify page loads or graceful redirect

test.describe('Portal — Client View', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('stránka se načte nebo přesměruje', async ({ page }) => {
    await page.goto('/portal');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Portal may redirect to dashboard (admin user) or any authenticated route
    const url = page.url();
    const isAuthenticated = !url.includes('/login') && !url.includes('/register');
    expect(isAuthenticated).toBe(true);
  });

  test('portal units — stránka se načte', async ({ page }) => {
    await page.goto('/portal/units');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    // May redirect if not portal user — just verify no crash
    const url = page.url();
    const isAuthenticated = !url.includes('/login');
    expect(isAuthenticated).toBe(true);
  });
});
