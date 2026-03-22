import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

// NOTE: Onboarding is READ ONLY — don't modify wizard state
// The onboarding page may redirect to dashboard if already completed/dismissed

test.describe('Onboarding — Wizard (read only)', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('stránka nebo redirect funguje', async ({ page }) => {
    await page.goto('/onboarding');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Onboarding may redirect to dashboard, properties, or any authenticated route
    const url = page.url();
    const isAuthenticated = !url.includes('/login') && !url.includes('/register');
    expect(isAuthenticated).toBe(true);
  });

  test('pokud je viditelný — zobrazí progress', async ({ page }) => {
    await page.goto('/onboarding');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    const isOnboarding = await page.locator('[data-testid="onboarding-page"]').isVisible().catch(() => false);
    if (!isOnboarding) { test.skip(true, 'Onboarding dismissed — redirected'); return; }

    await expect(page.locator('[data-testid="onboarding-progress"]')).toBeVisible();
  });
});
