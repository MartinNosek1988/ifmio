import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Finance', () => {
  test('Finance stránka se načte a taby fungují', async ({ page }) => {
    await login(page);
    await page.goto('/finance');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Check tabs exist (using data-testid if deployed, fallback to tab-btn class)
    const hasTestId = await page.locator('[data-testid="finance-tab-prescriptions"]').isVisible().catch(() => false);
    const hasTabBtn = await page.locator('.tab-btn').first().isVisible().catch(() => false);
    expect(hasTestId || hasTabBtn, 'Finance taby jsou viditelné').toBe(true);

    // Try switching tabs
    const tabs = page.locator('.tab-btn');
    const count = await tabs.count();
    if (count > 1) {
      await tabs.nth(1).click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
    }
  });
});
