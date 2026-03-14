import { createTestApp, closeTestApp, authRequest, TestApp } from './test.helpers'

describe('Scheduled Reports (e2e)', () => {
  let testApp: TestApp

  beforeAll(async () => {
    testApp = await createTestApp()
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  describe('Subscription CRUD', () => {
    it('lists subscriptions (initially empty)', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/reports/subscriptions').expect(200)

      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBe(0)
    })

    it('creates daily_digest subscription', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .post('/api/v1/reports/subscriptions', {
          reportType: 'daily_digest',
          isEnabled: true,
        })
        .expect(201)

      expect(res.body.reportType).toBe('daily_digest')
      expect(res.body.isEnabled).toBe(true)
      expect(res.body.frequency).toBe('daily')
    })

    it('upserts existing subscription (toggle off)', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .post('/api/v1/reports/subscriptions', {
          reportType: 'daily_digest',
          isEnabled: false,
        })
        .expect(201)

      expect(res.body.reportType).toBe('daily_digest')
      expect(res.body.isEnabled).toBe(false)
    })

    it('creates operations subscription with format', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .post('/api/v1/reports/subscriptions', {
          reportType: 'operations',
          frequency: 'weekly',
          format: 'csv',
          isEnabled: true,
        })
        .expect(201)

      expect(res.body.reportType).toBe('operations')
      expect(res.body.frequency).toBe('weekly')
      expect(res.body.format).toBe('csv')
    })

    it('creates assets subscription', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .post('/api/v1/reports/subscriptions', {
          reportType: 'assets',
          frequency: 'monthly',
          format: 'xlsx',
          isEnabled: true,
        })
        .expect(201)

      expect(res.body.reportType).toBe('assets')
      expect(res.body.frequency).toBe('monthly')
    })

    it('creates protocols subscription', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .post('/api/v1/reports/subscriptions', {
          reportType: 'protocols',
          frequency: 'daily',
          isEnabled: true,
        })
        .expect(201)

      expect(res.body.reportType).toBe('protocols')
    })

    it('lists all subscriptions', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/reports/subscriptions').expect(200)

      expect(res.body.length).toBe(4)
      const types = res.body.map((s: any) => s.reportType).sort()
      expect(types).toEqual(['assets', 'daily_digest', 'operations', 'protocols'])
    })

    it('upserts changes frequency without duplicating', async () => {
      const api = authRequest(testApp.server, testApp.token)

      await api
        .post('/api/v1/reports/subscriptions', {
          reportType: 'operations',
          frequency: 'monthly',
        })
        .expect(201)

      // Should still be 4 total (upserted, not created new)
      const res = await api.get('/api/v1/reports/subscriptions').expect(200)
      expect(res.body.length).toBe(4)

      const opsSub = res.body.find((s: any) => s.reportType === 'operations')
      expect(opsSub.frequency).toBe('monthly')
    })
  })
})
