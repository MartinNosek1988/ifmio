import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Finance', () => {
  test('Finance stránka se načte s taby', async ({ page }) => {
    await login(page);
    await page.goto('/finance');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Should see at least the prescriptions tab (default)
    await expect(page.locator('[data-testid="finance-tab-prescriptions"]')).toBeVisible();
    await expect(page.locator('[data-testid="finance-tab-doklady"]')).toBeVisible();
    await expect(page.locator('[data-testid="finance-tab-bank"]')).toBeVisible();
  });

  test('Přepínání Finance tabů', async ({ page }) => {
    await login(page);
    await page.goto('/finance');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    const tabs = ['prescriptions', 'doklady', 'bank', 'konto', 'components'];
    for (const tab of tabs) {
      const tabBtn = page.locator(`[data-testid="finance-tab-${tab}"]`);
      if (await tabBtn.isVisible().catch(() => false)) {
        await tabBtn.click();
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000);
      }
    }
  });
});
