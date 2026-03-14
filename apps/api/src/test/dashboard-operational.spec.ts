import { createTestApp, closeTestApp, authRequest, TestApp } from './test.helpers'

describe('Operational Dashboard (e2e)', () => {
  let testApp: TestApp

  beforeAll(async () => {
    testApp = await createTestApp()
    const api = authRequest(testApp.server, testApp.token)
    // Seed data
    await api.post('/api/v1/helpdesk', { title: 'Dashboard test ticket', priority: 'high' }).expect(201)
    await api.post('/api/v1/work-orders', { title: 'Dashboard test WO', priority: 'vysoka' }).expect(201)
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  describe('GET /api/v1/dashboard/operational', () => {
    it('returns role-aware operational dashboard', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/dashboard/operational').expect(200)

      expect(res.body).toHaveProperty('role')
      expect(res.body).toHaveProperty('attention')
      expect(res.body).toHaveProperty('workload')
      expect(res.body).toHaveProperty('period')
      expect(res.body).toHaveProperty('recentTickets')
      expect(res.body).toHaveProperty('recentWorkOrders')
    })

    it('returns attention metrics', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/dashboard/operational').expect(200)

      const { attention } = res.body
      expect(typeof attention.overdueTickets).toBe('number')
      expect(typeof attention.overdueWo).toBe('number')
      expect(typeof attention.highPrioTickets).toBe('number')
      expect(typeof attention.todayWoDeadlines).toBe('number')
    })

    it('returns workload counts', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/dashboard/operational').expect(200)

      expect(res.body.workload.openTickets).toBeGreaterThanOrEqual(1)
      expect(res.body.workload.openWo).toBeGreaterThanOrEqual(1)
    })

    it('returns recent lists with correct shape', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/dashboard/operational').expect(200)

      expect(Array.isArray(res.body.recentTickets)).toBe(true)
      expect(Array.isArray(res.body.recentWorkOrders)).toBe(true)

      if (res.body.recentTickets.length > 0) {
        const t = res.body.recentTickets[0]
        expect(t).toHaveProperty('id')
        expect(t).toHaveProperty('number')
        expect(t).toHaveProperty('title')
        expect(t).toHaveProperty('priority')
        expect(t).toHaveProperty('propertyName')
      }

      if (res.body.recentWorkOrders.length > 0) {
        const w = res.body.recentWorkOrders[0]
        expect(w).toHaveProperty('id')
        expect(w).toHaveProperty('title')
        expect(w).toHaveProperty('priority')
        expect(w).toHaveProperty('propertyName')
      }
    })

    it('returns period metrics', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/dashboard/operational').expect(200)

      expect(typeof res.body.period.resolvedTicketsLast30).toBe('number')
      expect(typeof res.body.period.completedWoLast30).toBe('number')
    })
  })
})
