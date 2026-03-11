import { createTestApp, closeTestApp, authRequest, TestApp } from '../test/test.helpers'

describe('Helpdesk (e2e)', () => {
  let testApp: TestApp
  let ticketId: string

  beforeAll(async () => {
    testApp = await createTestApp()
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  describe('POST /api/v1/helpdesk', () => {
    it('creates a ticket', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .post('/api/v1/helpdesk', {
          title: 'Testovací požadavek',
          description: 'Popis problému',
          category: 'general',
          priority: 'high',
        })
        .expect(201)

      expect(res.body).toHaveProperty('id')
      expect(res.body).toHaveProperty('number')
      expect(res.body.title).toBe('Testovací požadavek')
      ticketId = res.body.id
    })

    it('rejects ticket without title', async () => {
      const api = authRequest(testApp.server, testApp.token)
      await api
        .post('/api/v1/helpdesk', {
          description: 'No title',
        })
        .expect(400)
    })
  })

  describe('GET /api/v1/helpdesk', () => {
    it('lists tickets with pagination', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .get('/api/v1/helpdesk?page=1&limit=10')
        .expect(200)

      expect(res.body).toHaveProperty('data')
      expect(res.body).toHaveProperty('total')
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBeGreaterThanOrEqual(0)
    })

    it('filters by status', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .get('/api/v1/helpdesk?status=open')
        .expect(200)

      expect(res.body.data.every((t: any) => t.status === 'open')).toBe(true)
    })
  })

  describe('GET /api/v1/helpdesk/:id', () => {
    it('returns ticket detail with items', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .get(`/api/v1/helpdesk/${ticketId}`)
        .expect(200)

      expect(res.body.id).toBe(ticketId)
      expect(res.body).toHaveProperty('items')
      expect(Array.isArray(res.body.items)).toBe(true)
    })

    it('returns 404 for nonexistent ticket', async () => {
      const api = authRequest(testApp.server, testApp.token)
      await api
        .get('/api/v1/helpdesk/00000000-0000-0000-0000-000000000000')
        .expect(404)
    })
  })

  describe('PUT /api/v1/helpdesk/:id', () => {
    it('updates ticket status', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .put(`/api/v1/helpdesk/${ticketId}`, {
          status: 'in_progress',
          priority: 'urgent',
        })
        .expect(200)

      expect(res.body.status).toBe('in_progress')
    })
  })

  describe('DELETE /api/v1/helpdesk/:id', () => {
    it('deletes a ticket', async () => {
      const api = authRequest(testApp.server, testApp.token)
      // Create a fresh ticket to delete
      const createRes = await api
        .post('/api/v1/helpdesk', {
          title: 'K smazání',
          category: 'general',
        })
        .expect(201)

      await api
        .delete(`/api/v1/helpdesk/${createRes.body.id}`)
        .expect(204)
    })
  })
})
