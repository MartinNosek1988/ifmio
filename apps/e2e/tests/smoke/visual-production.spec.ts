import { test, expect } from '@playwright/test';
import { loginViaApi } from '../helpers/auth';

/**
 * Visual smoke test suite against the production environment.
 *
 * Verifies that the core UI modules load correctly and captures a screenshot of
 * each page as evidence. Also collects console errors and failed network
 * requests so any regressions are surfaced immediately.
 *
 * Run via:
 *   npx playwright test --config=playwright.production.config.ts
 */

// Modules required by the issue spec
const MODULES = [
  { name: 'Properties (Nemovitosti)', route: '/properties' },
  { name: 'Finance (Finance)',         route: '/finance' },
  { name: 'Work Orders (Pracovní příkazy)', route: '/workorders' },
  { name: 'Contacts (Kontakty)',       route: '/parties' },
];

test.describe('Vizuální smoke test – produkce', () => {
  // ─── 1. Login page ──────────────────────────────────────────────────────────
  test('1 – Login stránka se zobrazí správně', async ({ page }, testInfo) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="login-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-password"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-submit"]')).toBeVisible();

    const screenshot = await page.screenshot({ fullPage: true });
    await testInfo.attach('login-page', { body: screenshot, contentType: 'image/png' });
  });

  // ─── 2. Dashboard ───────────────────────────────────────────────────────────
  test('2 – Dashboard se načte po přihlášení', async ({ page }, testInfo) => {
    await loginViaApi(page);

    const jsErrors: string[] = [];
    const networkErrors: string[] = [];

    page.on('pageerror', err => jsErrors.push(`${page.url()}: ${err.message}`));
    page.on('response', res => {
      if (res.url().includes('/api/') && res.status() >= 500) {
        if (!res.url().includes('/admin/settings')) {
          networkErrors.push(`HTTP ${res.status()} – ${res.url()}`);
        }
      }
    });

    await page.waitForLoadState('networkidle');
    await expect(page.locator('.sidebar__logo')).toBeVisible();
    await expect(page).toHaveURL(/\/(dashboard|portal)/);

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length, 'Dashboard stránka je prázdná').toBeGreaterThan(10);

    const screenshot = await page.screenshot({ fullPage: true });
    await testInfo.attach('dashboard', { body: screenshot, contentType: 'image/png' });

    const realErrors = jsErrors.filter(
      e =>
        !e.includes('ResizeObserver') &&
        !e.includes('AbortError') &&
        !e.includes('cancelled') &&
        !e.includes('signal is aborted'),
    );
    expect(realErrors, 'JS chyby na dashboardu').toEqual([]);
    expect(networkErrors, '5xx API odpovědi na dashboardu').toEqual([]);
  });

  // ─── 3. Core modules ────────────────────────────────────────────────────────
  for (const mod of MODULES) {
    test(`3 – ${mod.name}`, async ({ page }, testInfo) => {
      await loginViaApi(page);

      const jsErrors: string[] = [];
      const networkErrors: string[] = [];

      page.on('pageerror', err => jsErrors.push(`${page.url()}: ${err.message}`));
      page.on('response', res => {
        if (res.url().includes('/api/') && res.status() >= 500) {
          if (!res.url().includes('/admin/settings')) {
            networkErrors.push(`HTTP ${res.status()} – ${res.url()}`);
          }
        }
      });

      await page.goto(mod.route);
      await page.waitForLoadState('networkidle');

      // Page must not be empty
      const bodyText = await page.locator('body').innerText();
      expect(bodyText.length, `${mod.name} – stránka je prázdná`).toBeGreaterThan(10);

      // No generic error screen
      const hasErrorScreen = await page
        .locator('text=Něco se pokazilo')
        .isVisible()
        .catch(() => false);
      expect(hasErrorScreen, `${mod.name} – zobrazuje chybovou stránku`).toBe(false);

      const screenshot = await page.screenshot({ fullPage: true });
      await testInfo.attach(mod.name, { body: screenshot, contentType: 'image/png' });

      const realErrors = jsErrors.filter(
        e =>
          !e.includes('ResizeObserver') &&
          !e.includes('AbortError') &&
          !e.includes('cancelled') &&
          !e.includes('signal is aborted'),
      );
      expect(realErrors, `JS chyby na stránce ${mod.name}`).toEqual([]);
      expect(networkErrors, `5xx API odpovědi na stránce ${mod.name}`).toEqual([]);
    });
  }
});
