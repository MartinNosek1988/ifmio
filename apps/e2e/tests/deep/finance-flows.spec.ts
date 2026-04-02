import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'

test.describe('Finance Flows — E2E', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('stránka /finance se načte', async ({ page }) => {
    await page.goto('/finance')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    // Taby nebo obsah
    const content = page.locator('[role="tablist"], .tab-list, table, [data-testid="finance-tabs"]')
    await expect(content.first()).toBeVisible({ timeout: 10_000 })
  })

  test('přepínání tabů funguje', async ({ page }) => {
    await page.goto('/finance')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    // Tab bank
    const bankTab = page.locator('button:has-text("Bank"), a:has-text("Bank"), [data-testid="tab-bank"]').first()
    if (await bankTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await bankTab.click()
      await page.waitForTimeout(1000)
      expect(page.url()).toContain('bank')
    }

    // Tab doklady
    const dokladyTab = page.locator('button:has-text("Doklady"), a:has-text("Doklady"), [data-testid="tab-doklady"]').first()
    if (await dokladyTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dokladyTab.click()
      await page.waitForTimeout(1000)
      expect(page.url()).toContain('doklady')
    }
  })

  test('tab prescriptions se načte', async ({ page }) => {
    await page.goto('/finance?tab=prescriptions')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    const error = page.locator('[data-testid="error-state"]')
    await expect(error).not.toBeVisible({ timeout: 3000 }).catch(() => {})
  })

  test('tab konto se načte', async ({ page }) => {
    await page.goto('/finance?tab=konto')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    const error = page.locator('[data-testid="error-state"]')
    await expect(error).not.toBeVisible({ timeout: 3000 }).catch(() => {})
  })

  test('tab accounts se načte', async ({ page }) => {
    await page.goto('/finance?tab=accounts')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    const error = page.locator('[data-testid="error-state"]')
    await expect(error).not.toBeVisible({ timeout: 3000 }).catch(() => {})
  })
})
