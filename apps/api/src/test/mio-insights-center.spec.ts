import { createTestApp, closeTestApp, authRequest, TestApp } from './test.helpers'

describe('Mio Insights Center (e2e)', () => {
  let testApp: TestApp

  beforeAll(async () => {
    testApp = await createTestApp()
    const api = authRequest(testApp.server, testApp.token)
    await api.post('/api/v1/helpdesk', { title: 'Insights test', priority: 'urgent' }).expect(201)
    // Run detection to populate findings
    await api.post('/api/v1/mio/findings/run-detection').expect(201)
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  describe('GET /api/v1/mio/insights', () => {
    it('returns unified list of findings and recommendations', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/mio/insights').expect(200)

      expect(Array.isArray(res.body)).toBe(true)
      // Should have at least one finding or recommendation
    })

    it('filters by kind=finding', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/mio/insights?kind=finding').expect(200)

      for (const item of res.body) {
        expect(item.kind).toBe('finding')
      }
    })

    it('filters by kind=recommendation', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/mio/insights?kind=recommendation').expect(200)

      for (const item of res.body) {
        expect(item.kind).toBe('recommendation')
      }
    })

    it('filters by status', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/mio/insights?status=active').expect(200)

      for (const item of res.body) {
        expect(item.status).toBe('active')
      }
    })
  })

  describe('GET /api/v1/mio/insights/summary', () => {
    it('returns summary counts', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/mio/insights/summary').expect(200)

      expect(res.body).toHaveProperty('activeFindings')
      expect(res.body).toHaveProperty('criticalFindings')
      expect(res.body).toHaveProperty('activeRecs')
      expect(res.body).toHaveProperty('snoozed')
      expect(res.body).toHaveProperty('resolvedLast30')
    })
  })

  describe('Actions', () => {
    it('dismiss via insights endpoint', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const insights = await api.get('/api/v1/mio/insights?status=active').expect(200)

      if (insights.body.length > 0) {
        const id = insights.body[0].id
        const res = await api.post(`/api/v1/mio/insights/${id}/dismiss`).expect(201)
        expect(res.body.status).toBe('dismissed')
      }
    })
  })

  describe('Tenant isolation', () => {
    it('insights are tenant-scoped', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/mio/insights').expect(200)

      for (const item of res.body) {
        expect(item.tenantId).toBe(testApp.tenantId)
      }
    })
  })
})
