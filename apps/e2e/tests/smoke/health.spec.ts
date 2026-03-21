import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

const ROUTES = [
  '/dashboard', '/properties', '/principals', '/parties', '/residents',
  '/finance', '/helpdesk', '/workorders', '/documents', '/meters',
  '/calendar', '/assets', '/kanban', '/settings', '/team', '/audit',
];

test.describe('Zdraví aplikace', () => {
  test('Všechny stránky se načtou bez JS chyb', async ({ page }) => {
    await login(page);
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(`${page.url()}: ${err.message}`));

    for (const route of ROUTES) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
    }

    expect(errors).toEqual([]);
  });

  test('Žádné 5xx API odpovědi při navigaci', async ({ page }) => {
    await login(page);
    const serverErrors: string[] = [];
    page.on('response', res => {
      if (res.url().includes('/api/') && res.status() >= 500) {
        serverErrors.push(`${res.status()} ${res.url()}`);
      }
    });

    for (const route of ROUTES) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
    }

    expect(serverErrors).toEqual([]);
  });

  test('Žádná stránka není prázdná', async ({ page }) => {
    await login(page);

    for (const route of ROUTES) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      const bodyText = await page.locator('body').innerText();
      expect(bodyText.length, `${route} je prázdná`).toBeGreaterThan(10);
    }
  });
});
