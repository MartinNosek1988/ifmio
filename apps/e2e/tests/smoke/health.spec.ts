import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

const ROUTES = [
  '/dashboard', '/properties', '/principals', '/parties', '/residents',
  '/finance', '/helpdesk', '/workorders', '/documents', '/meters',
  '/calendar', '/assets', '/kanban', '/settings', '/team', '/audit',
];

test.describe('Zdraví aplikace', () => {
  test('Všechny stránky — bez JS chyb, bez 5xx, neprázdné', async ({ page }) => {
    test.setTimeout(90_000);
    await login(page);

    const jsErrors: string[] = [];
    const serverErrors: string[] = [];
    page.on('pageerror', err => jsErrors.push(`${page.url()}: ${err.message}`));
    page.on('response', res => {
      if (res.url().includes('/api/') && res.status() >= 500) {
        serverErrors.push(`${res.status()} ${res.url()}`);
      }
    });

    for (const route of ROUTES) {
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);
      const bodyText = await page.locator('body').innerText();
      expect(bodyText.length, `${route} je prázdná`).toBeGreaterThan(10);
    }

    const realErrors = jsErrors.filter(e =>
      !e.includes('ResizeObserver') &&
      !e.includes('AbortError') &&
      !e.includes('cancelled') &&
      !e.includes('signal is aborted')
    );
    expect(realErrors, 'JS chyby na stránkách').toEqual([]);
    expect(serverErrors, '5xx API odpovědi').toEqual([]);
  });
});
