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
  test('all main pages render without error', async ({ page }) => {
    await login(page);

    for (const { path, title } of PAGES) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      // Should NOT show an error boundary crash
      const hasError = await page.locator('text=Něco se pokazilo').isVisible().catch(() => false);
      expect(hasError, `${title} (${path}) shows error boundary`).toBe(false);
      // Sidebar should still be visible (we're authenticated)
      await expect(page.locator('.sidebar__logo')).toBeVisible({ timeout: 5_000 });
    }
  });
});
