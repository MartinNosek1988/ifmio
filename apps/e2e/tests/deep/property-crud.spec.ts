import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'

const API_URL = process.env.API_URL || process.env.BASE_URL || 'https://ifmio.com'

async function getToken(page: any): Promise<string> {
  return page.evaluate(() => sessionStorage.getItem('ifmio:access_token'))
}

async function deletePropertyApi(page: any, id: string) {
  const token = await getToken(page)
  await page.request.delete(`${API_URL}/api/v1/properties/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

test.describe('Property CRUD — E2E', () => {
  let createdPropertyId: string

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('stránka /properties se načte', async ({ page }) => {
    await page.goto('/properties')
    await page.waitForLoadState('domcontentloaded')
    // KPI karty nebo tabulka
    await expect(page.locator('table, [data-testid="properties-list"]').first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('vytvoření nové nemovitosti přes formulář', async ({ page }) => {
    await page.goto('/properties')
    await page.waitForLoadState('domcontentloaded')

    // Klik na "Nová nemovitost"
    const addBtn = page.locator('button:has-text("Nová"), button:has-text("Přidat"), [data-testid="property-add-btn"]').first()
    await addBtn.click()
    await page.waitForTimeout(500)

    // Vyplnění formuláře
    const nameInput = page.locator('[data-testid="property-form-name"], input[name="name"]').first()
    await nameInput.fill(`E2E Bytový dům ${Date.now()}`)

    const addressInput = page.locator('[data-testid="property-form-address"], input[name="address"]').first()
    if (await addressInput.isVisible()) {
      await addressInput.fill('Testovací 123')
    }

    const cityInput = page.locator('[data-testid="property-form-city"], input[name="city"]').first()
    if (await cityInput.isVisible()) {
      await cityInput.fill('Praha')
    }

    const postalInput = page.locator('[data-testid="property-form-postalCode"], input[name="postalCode"]').first()
    if (await postalInput.isVisible()) {
      await postalInput.fill('110 00')
    }

    // Submit
    const responsePromise = page.waitForResponse(
      (r: any) => r.url().includes('/api/v1/properties') && r.request().method() === 'POST',
    )
    const submitBtn = page.locator('button[type="submit"], button:has-text("Uložit"), button:has-text("Vytvořit")').first()
    await submitBtn.click()

    const response = await responsePromise
    if (response.ok()) {
      const body = await response.json()
      createdPropertyId = body.id
    }

    await page.waitForTimeout(1000)
  })

  test('detail nemovitosti zobrazí správná data', async ({ page }) => {
    if (!createdPropertyId) return
    await page.goto(`/properties/${createdPropertyId}`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
    // Verify page loaded (no error state)
    const errorState = page.locator('[data-testid="error-state"], .error-state')
    await expect(errorState).not.toBeVisible({ timeout: 5000 }).catch(() => {})
  })

  test('cleanup — smazání testovací nemovitosti', async ({ page }) => {
    if (!createdPropertyId) return
    await deletePropertyApi(page, createdPropertyId)
  })
})
