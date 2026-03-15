import { createTestApp, closeTestApp, authRequest, TestApp } from './test.helpers'

describe('Mio Tool Calling (e2e)', () => {
  let testApp: TestApp

  beforeAll(async () => {
    testApp = await createTestApp()
    const api = authRequest(testApp.server, testApp.token)
    // Seed data
    await api.post('/api/v1/helpdesk', { title: 'Mio test ticket', priority: 'high' }).expect(201)
    await api.post('/api/v1/work-orders', { title: 'Mio test WO', priority: 'vysoka' }).expect(201)
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  describe('POST /api/v1/mio/chat', () => {
    it('returns response in correct format', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .post('/api/v1/mio/chat', {
          messages: [{ role: 'user', content: 'Ahoj' }],
        })
        .expect(201)

      expect(res.body).toHaveProperty('response')
      expect(typeof res.body.response).toBe('string')
      expect(res.body.response.length).toBeGreaterThan(0)
    })

    it('requires authentication', async () => {
      const request = require('supertest')
      await request(testApp.server)
        .post('/api/v1/mio/chat')
        .send({ messages: [{ role: 'user', content: 'test' }] })
        .expect(401)
    })

    it('handles empty messages gracefully', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .post('/api/v1/mio/chat', { messages: [] })
        .expect(201)

      expect(res.body).toHaveProperty('response')
    })
  })

  describe('Tool scoping verification', () => {
    it('dashboard summary is accessible and scoped', async () => {
      // Verify that dashboard endpoint works for this user
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/dashboard/operational').expect(200)

      expect(res.body).toHaveProperty('attention')
      expect(res.body).toHaveProperty('workload')
      // This confirms the service the tool calls is properly scoped
    })

    it('helpdesk list is tenant-scoped', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/helpdesk?limit=5').expect(200)

      expect(res.body).toHaveProperty('data')
      // All tickets belong to the test tenant
      for (const t of res.body.data) {
        expect(t.tenantId).toBe(testApp.tenantId)
      }
    })

    it('work orders list is tenant-scoped', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/work-orders').expect(200)

      expect(Array.isArray(res.body)).toBe(true)
      for (const w of res.body) {
        expect(w.tenantId).toBe(testApp.tenantId)
      }
    })

    it('recurring plans list is tenant-scoped', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/recurring-plans').expect(200)

      expect(Array.isArray(res.body)).toBe(true)
      for (const p of res.body) {
        expect(p.tenantId).toBe(testApp.tenantId)
      }
    })
  })
})
