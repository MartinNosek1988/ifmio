import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'

const API_URL = process.env.API_URL || process.env.BASE_URL || 'https://ifmio.com'

test.describe('Security — E2E', () => {
  test.describe('Protected routes bez přihlášení', () => {
    test('/dashboard → redirect na /login', async ({ page }) => {
      await page.goto('/login')
      await page.evaluate(() => sessionStorage.clear())
      await page.goto('/dashboard')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(3000)
      expect(page.url()).toContain('/login')
    })

    test('/finance → redirect na /login', async ({ page }) => {
      await page.goto('/login')
      await page.evaluate(() => sessionStorage.clear())
      await page.goto('/finance')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(3000)
      expect(page.url()).toContain('/login')
    })

    test('/team → redirect na /login', async ({ page }) => {
      await page.goto('/login')
      await page.evaluate(() => sessionStorage.clear())
      await page.goto('/team')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(3000)
      expect(page.url()).toContain('/login')
    })
  })

  test.describe('API bez tokenu → 401', () => {
    test('GET /properties bez Authorization → 401', async ({ page }) => {
      const res = await page.request.get(`${API_URL}/api/v1/properties`, {
        headers: { 'Content-Type': 'application/json' },
      })
      expect(res.status()).toBe(401)
    })

    test('GET /finance/invoices bez Authorization → 401', async ({ page }) => {
      const res = await page.request.get(`${API_URL}/api/v1/finance/invoices`, {
        headers: { 'Content-Type': 'application/json' },
      })
      expect(res.status()).toBe(401)
    })

    test('GET /admin/users bez Authorization → 401', async ({ page }) => {
      const res = await page.request.get(`${API_URL}/api/v1/admin/users`, {
        headers: { 'Content-Type': 'application/json' },
      })
      expect(res.status()).toBe(401)
    })
  })

  test.describe('XSS prevence', () => {
    test('script tag v property name je sanitizován', async ({ page }) => {
      await login(page)
      const token = await page.evaluate(() =>
        sessionStorage.getItem('ifmio:access_token'),
      )

      // Vytvoř property s XSS payloadem přes API
      const res = await page.request.post(`${API_URL}/api/v1/properties`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: {
          name: '<script>alert(1)</script>Bezpečný Dům',
          address: 'XSS 1',
          city: 'Praha',
          postalCode: '110 00',
          type: 'SVJ',
          ownership: 'vlastnictvi',
        },
      })

      if (res.ok()) {
        const body = await res.json()
        // Ověř že response NEobsahuje script tag
        expect(body.name).not.toContain('<script>')
        expect(body.name).toContain('Bezpečný Dům')

        // Cleanup
        await page.request.delete(`${API_URL}/api/v1/properties/${body.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      }
    })
  })

  test.describe('Page refresh zachová stav', () => {
    test('po refresh zůstane na /properties', async ({ page }) => {
      await login(page)
      await page.goto('/properties')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1000)

      // Refresh
      await page.reload()
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(2000)

      // Stále na /properties (ne redirect na /login)
      expect(page.url()).toContain('/properties')
    })
  })

  test.describe('Browser back button', () => {
    test('zpět z /properties na /dashboard', async ({ page }) => {
      await login(page)
      await page.goto('/dashboard')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1000)

      await page.goto('/properties')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1000)

      await page.goBack()
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1000)

      // Měli bychom být zpět na dashboard
      expect(page.url()).toContain('/dashboard')
    })
  })
})
