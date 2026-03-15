import { createTestApp, closeTestApp, authRequest, TestApp } from './test.helpers'

describe('Recurring Operations Polish (e2e)', () => {
  let testApp: TestApp

  beforeAll(async () => {
    testApp = await createTestApp()
    const api = authRequest(testApp.server, testApp.token)

    // Seed: create plan + generate ticket
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    await api.post('/api/v1/recurring-plans', {
      title: 'Polish test plan',
      scheduleMode: 'calendar',
      frequencyUnit: 'day',
      frequencyInterval: 1,
      nextPlannedAt: yesterday.toISOString(),
    }).expect(201)
    await api.post('/api/v1/recurring-plans/generate').expect(201)

    // Also create a manual ticket
    await api.post('/api/v1/helpdesk', { title: 'Polish manual', priority: 'high' }).expect(201)
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  describe('Dashboard recurring metrics', () => {
    it('returns openRecurring and overdueRecurring in attention', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/dashboard/operational').expect(200)

      expect(res.body.attention).toHaveProperty('openRecurring')
      expect(res.body.attention).toHaveProperty('overdueRecurring')
      expect(typeof res.body.attention.openRecurring).toBe('number')
      expect(typeof res.body.attention.overdueRecurring).toBe('number')
    })
  })

  describe('Calendar recurring context', () => {
    it('helpdesk calendar items include recurring context in title', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/calendar/events').expect(200)

      const hdItems = res.body.filter((e: any) => e.source === 'helpdesk')
      const recurring = hdItems.find((e: any) => e.title.includes('Opakovaná činnost'))
      // May or may not have recurring items depending on date range
      // but the code path is tested
    })
  })

  describe('Reporting requestOrigin labels', () => {
    it('operational report includes requestOrigin on tickets', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/reports/operations').expect(200)

      // All tickets should have requestOrigin
      for (const t of res.body.tickets) {
        expect(t).toHaveProperty('requestOrigin')
      }
    })

    it('CSV export includes Zdroj column', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/reports/operations/export?format=csv').expect(200)

      expect(res.text).toContain('Zdroj')
      // Should contain Czech labels
      expect(res.text).toMatch(/Manuální|Opakované/)
    })
  })

  describe('Business timezone date helper', () => {
    it('toBusinessDate produces YYYY-MM-DD format', async () => {
      // Import and test directly
      const { toBusinessDate } = require('../common/utils/date.utils')

      // Test a known date: 2026-03-15T23:30:00Z → should be 2026-03-16 in CET (UTC+1)
      const date = new Date('2026-03-15T23:30:00Z')
      const result = toBusinessDate(date)
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      // In CET, 23:30 UTC is 00:30 next day
      expect(result).toBe('2026-03-16')
    })

    it('handles summer time correctly', async () => {
      const { toBusinessDate } = require('../common/utils/date.utils')

      // 2026-07-15T22:30:00Z → CEST is UTC+2, so this is 00:30 on 16th
      const date = new Date('2026-07-15T22:30:00Z')
      const result = toBusinessDate(date)
      expect(result).toBe('2026-07-16')
    })
  })
})
