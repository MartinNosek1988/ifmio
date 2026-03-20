import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

// Main sidebar sections visible to fm/owner role
const PAGES = [
  { path: '/dashboard', title: 'Dashboard' },
  { path: '/helpdesk', title: 'Helpdesk' },
  { path: '/workorders', title: 'Pracovní úkoly' },
  { path: '/properties', title: 'Nemovitosti' },
  { path: '/principals', title: 'Klienti' },
  { path: '/parties', title: 'Adresář' },
  { path: '/residents', title: 'Bydlící' },
  { path: '/finance', title: 'Finance' },
  { path: '/documents', title: 'Dokumenty' },
  { path: '/meters', title: 'Měřidla' },
  { path: '/calendar', title: 'Kalendář' },
  { path: '/settings', title: 'Nastavení' },
];

test.describe('Sidebar navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const { path, title } of PAGES) {
    test(`${title} (${path}) renders without error`, async ({ page }) => {
      await page.goto(path);
      // Wait for the page to finish loading (spinner gone)
      await page.waitForLoadState('networkidle');
      // Should NOT show an error boundary crash
      await expect(page.locator('text=Něco se pokazilo')).not.toBeVisible();
      // Page title should contain the expected text
      await expect(page.locator('.topbar__title')).toContainText(title, { timeout: 10_000 });
    });
  }
});
