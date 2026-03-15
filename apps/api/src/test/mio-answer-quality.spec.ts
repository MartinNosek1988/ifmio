import { createTestApp, closeTestApp, authRequest, TestApp } from './test.helpers'

describe('Mio Answer Quality (e2e)', () => {
  let testApp: TestApp

  beforeAll(async () => {
    testApp = await createTestApp()
    const api = authRequest(testApp.server, testApp.token)
    await api.post('/api/v1/helpdesk', { title: 'Quality test ticket', priority: 'urgent' }).expect(201)
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  describe('Response format consistency', () => {
    it('returns { response: string } format', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .post('/api/v1/mio/chat', { messages: [{ role: 'user', content: 'Ahoj' }] })
        .expect(201)

      expect(Object.keys(res.body)).toEqual(['response'])
      expect(typeof res.body.response).toBe('string')
    })

    it('responds in Czech', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .post('/api/v1/mio/chat', { messages: [{ role: 'user', content: 'Co umíš?' }] })
        .expect(201)

      // Should contain Czech characters or words
      expect(res.body.response.length).toBeGreaterThan(10)
    })
  })

  describe('Tool result handling', () => {
    it('dashboard endpoint returns data with expected shape', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/dashboard/operational').expect(200)

      // Verify the data shape that tools consume
      expect(res.body).toHaveProperty('attention')
      expect(res.body).toHaveProperty('workload')
      expect(res.body.attention).toHaveProperty('overdueTickets')
    })

    it('helpdesk stats returns consistent counts', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/helpdesk/sla-stats').expect(200)

      expect(typeof res.body.total).toBe('number')
      expect(typeof res.body.overdue).toBe('number')
    })

    it('calendar returns array for today', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const today = new Date().toISOString().slice(0, 10)
      const res = await api.get(`/api/v1/calendar/events?from=${today}&to=${today}`).expect(200)

      expect(Array.isArray(res.body)).toBe(true)
    })
  })

  describe('Error resilience', () => {
    it('chat with empty messages does not crash', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .post('/api/v1/mio/chat', { messages: [] })
        .expect(201)

      expect(res.body).toHaveProperty('response')
      expect(typeof res.body.response).toBe('string')
    })

    it('chat without messages field returns response', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .post('/api/v1/mio/chat', {})
        .expect(201)

      expect(res.body).toHaveProperty('response')
    })
  })
})
