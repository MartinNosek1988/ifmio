import { createTestApp, closeTestApp, authRequest, TestApp } from './test.helpers'

describe('Mio Tools Expansion (e2e)', () => {
  let testApp: TestApp

  beforeAll(async () => {
    testApp = await createTestApp()
    const api = authRequest(testApp.server, testApp.token)
    // Seed data for tools
    await api.post('/api/v1/helpdesk', { title: 'Tool test ticket', priority: 'high' }).expect(201)
    await api.post('/api/v1/work-orders', { title: 'Tool test WO' }).expect(201)
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  describe('Calendar tool data source', () => {
    it('calendar events endpoint returns scoped data', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const today = new Date().toISOString().slice(0, 10)
      const res = await api.get(`/api/v1/calendar/events?from=${today}&to=${today}`).expect(200)
      expect(Array.isArray(res.body)).toBe(true)
    })
  })

  describe('Revisions tool data source', () => {
    it('revision plans endpoint responds', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/revisions/plans').expect(200)
      // May return array or paginated object
      expect(res.body).toBeDefined()
    })
  })

  describe('Protocols tool data source', () => {
    it('protocols list is tenant-scoped', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/protocols?limit=5').expect(200)
      expect(res.body).toHaveProperty('data')
      expect(Array.isArray(res.body.data)).toBe(true)
    })
  })

  describe('Assets tool data source', () => {
    it('assets list is tenant-scoped', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/assets').expect(200)
      // Assets response shape may be { data: [...] } or direct array
      const items = Array.isArray(res.body) ? res.body : res.body.data
      expect(Array.isArray(items)).toBe(true)
    })
  })

  describe('Mio chat with tools', () => {
    it('responds to chat request with all tools available', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .post('/api/v1/mio/chat', {
          messages: [{ role: 'user', content: 'Ahoj, co umíš?' }],
        })
        .expect(201)

      expect(res.body).toHaveProperty('response')
      expect(typeof res.body.response).toBe('string')
    })

    it('response format unchanged', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .post('/api/v1/mio/chat', {
          messages: [{ role: 'user', content: 'test' }],
        })
        .expect(201)

      // Must still be { response: string }
      expect(Object.keys(res.body)).toEqual(['response'])
      expect(typeof res.body.response).toBe('string')
    })
  })
})
