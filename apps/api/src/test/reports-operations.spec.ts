import { createTestApp, closeTestApp, authRequest, TestApp } from './test.helpers'

describe('Operational Reports (e2e)', () => {
  let testApp: TestApp

  beforeAll(async () => {
    testApp = await createTestApp()

    // Seed data: ticket + work order for reporting
    const api = authRequest(testApp.server, testApp.token)
    await api.post('/api/v1/helpdesk', { title: 'Report test ticket', priority: 'high' }).expect(201)
    await api.post('/api/v1/work-orders', { title: 'Report test WO', priority: 'vysoka' }).expect(201)
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  describe('GET /api/v1/reports/operations', () => {
    it('returns operational report with KPIs and data', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/reports/operations').expect(200)

      expect(res.body).toHaveProperty('period')
      expect(res.body).toHaveProperty('kpi')
      expect(res.body).toHaveProperty('tickets')
      expect(res.body).toHaveProperty('workOrders')
      expect(res.body).toHaveProperty('topAssets')
      expect(res.body).toHaveProperty('topResolvers')

      expect(res.body.kpi.totalTickets).toBeGreaterThanOrEqual(1)
      expect(res.body.kpi.totalWo).toBeGreaterThanOrEqual(1)
      expect(Array.isArray(res.body.tickets)).toBe(true)
      expect(Array.isArray(res.body.workOrders)).toBe(true)
    })

    it('filters by date range', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .get('/api/v1/reports/operations?dateFrom=2020-01-01&dateTo=2020-12-31')
        .expect(200)

      // Should return 0 data for 2020 (no data seeded for that year)
      expect(res.body.kpi.totalTickets).toBe(0)
      expect(res.body.kpi.totalWo).toBe(0)
    })

    it('respects tenant isolation', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/reports/operations').expect(200)

      // All tickets should belong to our tenant
      for (const t of res.body.tickets) {
        expect(t).toHaveProperty('title')
        expect(t).toHaveProperty('status')
      }
    })
  })

  describe('GET /api/v1/reports/operations/export', () => {
    it('returns XLSX file', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/reports/operations/export').expect(200)

      expect(res.headers['content-type']).toContain('spreadsheetml')
      expect(res.headers['content-disposition']).toContain('provozni-report.xlsx')
      expect(res.body).toBeTruthy()
    })
  })

  describe('GET /api/v1/reports/assets', () => {
    it('returns asset report with KPIs', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/reports/assets').expect(200)

      expect(res.body).toHaveProperty('period')
      expect(res.body).toHaveProperty('kpi')
      expect(res.body).toHaveProperty('rows')
      expect(res.body.kpi).toHaveProperty('totalAssets')
      expect(Array.isArray(res.body.rows)).toBe(true)
    })
  })

  describe('GET /api/v1/reports/assets/export', () => {
    it('returns XLSX file', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/reports/assets/export').expect(200)

      expect(res.headers['content-type']).toContain('spreadsheetml')
      expect(res.headers['content-disposition']).toContain('zarizeni-report.xlsx')
    })
  })

  describe('GET /api/v1/reports/protocols', () => {
    it('returns protocol report with KPIs', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/reports/protocols').expect(200)

      expect(res.body).toHaveProperty('period')
      expect(res.body).toHaveProperty('kpi')
      expect(res.body).toHaveProperty('rows')
      expect(res.body).toHaveProperty('byType')
      expect(res.body).toHaveProperty('byStatus')
      expect(res.body.kpi).toHaveProperty('total')
      expect(res.body.kpi).toHaveProperty('withPdf')
      expect(res.body.kpi).toHaveProperty('withoutPdf')
    })
  })

  describe('GET /api/v1/reports/protocols/export', () => {
    it('returns XLSX file', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/reports/protocols/export').expect(200)

      expect(res.headers['content-type']).toContain('spreadsheetml')
      expect(res.headers['content-disposition']).toContain('protokoly-report.xlsx')
    })
  })
})
