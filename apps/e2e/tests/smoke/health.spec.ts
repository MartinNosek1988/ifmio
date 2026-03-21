import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

const ROUTES = [
  '/dashboard', '/properties', '/principals', '/parties', '/residents',
  '/finance', '/helpdesk', '/workorders', '/documents', '/meters',
  '/calendar', '/assets', '/kanban', '/settings', '/team', '/audit',
];

test.describe('Health check — all pages', () => {
  test('all main pages load without JS errors', async ({ page }) => {
    await login(page);
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(`${page.url()}: ${err.message}`));

    for (const route of ROUTES) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
    }

    expect(errors).toEqual([]);
  });

  test('no 5xx API responses during navigation', async ({ page }) => {
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
});
