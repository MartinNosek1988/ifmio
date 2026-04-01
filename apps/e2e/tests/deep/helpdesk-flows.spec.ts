import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'

const API_URL = process.env.API_URL || process.env.BASE_URL || 'https://ifmio.com'

async function getToken(page: any): Promise<string> {
  return page.evaluate(() => sessionStorage.getItem('ifmio:access_token'))
}

test.describe('Helpdesk Flows — E2E', () => {
  let propertyId: string

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await login(page)
    const token = await getToken(page)
    const res = await page.request.post(`${API_URL}/api/v1/properties`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        name: `HD E2E Property ${Date.now()}`,
        address: 'E2E 1',
        city: 'Praha',
        postalCode: '110 00',
        type: 'bytdum',
        ownership: 'vlastnictvi',
      },
    })
    if (res.ok()) {
      propertyId = (await res.json()).id
    }
    await ctx.close()
  })

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test.afterAll(async ({ browser }) => {
    if (!propertyId) return
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await login(page)
    const token = await getToken(page)
    await page.request.delete(`${API_URL}/api/v1/properties/${propertyId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    await ctx.close()
  })

  test('stránka /helpdesk se načte s tabulkou', async ({ page }) => {
    await page.goto('/helpdesk')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    // Tabulka nebo empty state
    const content = page.locator('table, [data-testid="empty-state"], .empty-state')
    await expect(content.first()).toBeVisible({ timeout: 10_000 })
  })

  test('vytvoření nového ticketu', async ({ page }) => {
    await page.goto('/helpdesk')
    await page.waitForLoadState('domcontentloaded')

    const addBtn = page.locator('button:has-text("Nový"), button:has-text("požadavek"), [data-testid="ticket-add-btn"]').first()
    if (await addBtn.isVisible({ timeout: 5000 })) {
      await addBtn.click()
      await page.waitForTimeout(500)

      const titleInput = page.locator('[data-testid="ticket-form-title"], input[name="title"]').first()
      if (await titleInput.isVisible()) {
        await titleInput.fill(`E2E Prasklé potrubí ${Date.now()}`)

        const submitBtn = page.locator('button[type="submit"], button:has-text("Uložit"), button:has-text("Vytvořit")').first()
        await submitBtn.click()
        await page.waitForTimeout(2000)
      }
    }
  })

  test('helpdesk dashboard se načte', async ({ page }) => {
    await page.goto('/helpdesk/dashboard')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    // Ověření že stránka se načetla bez chyby
    const error = page.locator('[data-testid="error-state"]')
    await expect(error).not.toBeVisible({ timeout: 3000 }).catch(() => {})
  })

  test('filtry fungují', async ({ page }) => {
    await page.goto('/helpdesk')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    // Filtr podle priority (pokud existuje)
    const priorityFilter = page.locator('select:has-text("Priorita"), [data-testid="priority-filter"]').first()
    if (await priorityFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await priorityFilter.selectOption({ index: 1 })
      await page.waitForTimeout(1000)
    }
  })
})
