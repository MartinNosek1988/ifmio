import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

const SIDEBAR_MODULES = [
  'dashboard', 'helpdesk', 'workorders', 'properties', 'principals',
  'parties', 'residents', 'finance', 'documents', 'meters', 'calendar', 'settings',
];

test.describe('Sidebar navigation', () => {
  test('all main pages render without error', async ({ page }) => {
    await login(page);

    for (const mod of SIDEBAR_MODULES) {
      const navItem = page.locator(`[data-testid="sidebar-nav-${mod}"]`);
      if (await navItem.isVisible().catch(() => false)) {
        await navItem.click();
        await page.waitForLoadState('networkidle');
        const hasError = await page.locator('text=Něco se pokazilo').isVisible().catch(() => false);
        expect(hasError, `${mod} shows error boundary`).toBe(false);
        await expect(page.locator('.sidebar__logo')).toBeVisible({ timeout: 5_000 });
      }
    }
  });
});
