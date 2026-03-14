import { createTestApp, closeTestApp, authRequest, TestApp } from '../test/test.helpers'

describe('Helpdesk (e2e)', () => {
  let testApp: TestApp
  let ticketId: string
  let userId: string

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
      expect(res.body.createdAt).toBeDefined()
      expect(res.body.resolutionDueAt).toBeDefined()
      expect(res.body.requesterUserId).toBeDefined()
      ticketId = res.body.id
      userId = res.body.requesterUserId
    })

    it('creates a ticket with responsibility fields', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .post('/api/v1/helpdesk', {
          title: 'Ticket s dispečerem',
          priority: 'urgent',
          dispatcherUserId: userId,
        })
        .expect(201)

      expect(res.body.dispatcherUserId).toBe(userId)
      expect(res.body.requesterUserId).toBe(userId) // defaults to current user
      expect(res.body.resolutionDueAt).toBeDefined()
      expect(res.body.deadlineManuallySet).toBe(false)
      expect(res.body.dispatcher).toBeDefined()
      expect(res.body.dispatcher.name).toBeDefined()
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

      // Verify new fields in list response
      if (res.body.data.length > 0) {
        const t = res.body.data[0]
        expect(t).toHaveProperty('assignee')
        expect(t).toHaveProperty('requester')
        expect(t).toHaveProperty('dispatcher')
        expect(t).toHaveProperty('asset')
      }
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
    it('returns ticket detail with all operational fields', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .get(`/api/v1/helpdesk/${ticketId}`)
        .expect(200)

      expect(res.body.id).toBe(ticketId)
      expect(res.body).toHaveProperty('items')
      expect(Array.isArray(res.body.items)).toBe(true)

      // Operational fields
      expect(res.body).toHaveProperty('createdAt')
      expect(res.body).toHaveProperty('resolutionDueAt')
      expect(res.body).toHaveProperty('deadlineManuallySet')
      expect(res.body).toHaveProperty('requesterUserId')
      expect(res.body).toHaveProperty('dispatcherUserId')
      expect(res.body).toHaveProperty('assigneeId')
      expect(res.body).toHaveProperty('assetId')
      expect(res.body).toHaveProperty('requester')
      expect(res.body).toHaveProperty('dispatcher')
      expect(res.body).toHaveProperty('assignee')
      expect(res.body).toHaveProperty('asset')
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

    it('updates responsibility fields', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .put(`/api/v1/helpdesk/${ticketId}`, {
          dispatcherUserId: userId,
          assigneeId: userId,
        })
        .expect(200)

      expect(res.body.dispatcherUserId).toBe(userId)
      expect(res.body.assigneeId).toBe(userId)
    })

    it('recalculates deadline on priority change when not manually set', async () => {
      const api = authRequest(testApp.server, testApp.token)

      // Get current deadline
      const before = await api.get(`/api/v1/helpdesk/${ticketId}`).expect(200)
      const oldDeadline = before.body.resolutionDueAt

      // Change priority
      const res = await api
        .put(`/api/v1/helpdesk/${ticketId}`, { priority: 'low' })
        .expect(200)

      // Deadline should have changed (low has longer resolution time)
      expect(res.body.resolutionDueAt).not.toBe(oldDeadline)
      expect(res.body.deadlineManuallySet).toBe(false)
    })

    it('allows manual deadline override', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const manualDeadline = '2026-12-31T23:59:59.000Z'

      const res = await api
        .put(`/api/v1/helpdesk/${ticketId}`, { resolutionDueAt: manualDeadline })
        .expect(200)

      expect(res.body.deadlineManuallySet).toBe(true)
      expect(res.body.resolutionDueAt).toBe(manualDeadline)
    })

    it('does not recalculate deadline on priority change when manually set', async () => {
      const api = authRequest(testApp.server, testApp.token)

      // Deadline was manually set in previous test
      const before = await api.get(`/api/v1/helpdesk/${ticketId}`).expect(200)
      expect(before.body.deadlineManuallySet).toBe(true)
      const manualDeadline = before.body.resolutionDueAt

      // Change priority — deadline should NOT change
      const res = await api
        .put(`/api/v1/helpdesk/${ticketId}`, { priority: 'medium' })
        .expect(200)

      expect(res.body.resolutionDueAt).toBe(manualDeadline)
      expect(res.body.deadlineManuallySet).toBe(true)
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
