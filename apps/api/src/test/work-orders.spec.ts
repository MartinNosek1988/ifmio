import { createTestApp, closeTestApp, authRequest, TestApp } from './test.helpers'

describe('Work Orders (e2e)', () => {
  let testApp: TestApp
  let woId: string
  let ticketId: string

  beforeAll(async () => {
    testApp = await createTestApp()
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  describe('POST /api/v1/work-orders', () => {
    it('creates a work order', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .post('/api/v1/work-orders', {
          title: 'Oprava ventilace',
          priority: 'vysoka',
          description: 'Ventilace nefunguje',
        })
        .expect(201)

      expect(res.body).toHaveProperty('id')
      expect(res.body.title).toBe('Oprava ventilace')
      expect(res.body.priority).toBe('vysoka')
      expect(res.body.status).toBe('nova')
      expect(res.body.requesterUserId).toBeDefined()
      expect(res.body.createdAt).toBeDefined()
      woId = res.body.id
    })

    it('creates with operational fields', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const userId = (await api.get(`/api/v1/work-orders/${woId}`).expect(200)).body.requesterUserId

      const res = await api
        .post('/api/v1/work-orders', {
          title: 'Úkol s dispečerem',
          dispatcherUserId: userId,
        })
        .expect(201)

      expect(res.body.dispatcherUserId).toBe(userId)
      expect(res.body.dispatcherUser).toBeDefined()
      expect(res.body.dispatcherUser.name).toBeDefined()
    })

    it('rejects invalid assignee', async () => {
      const api = authRequest(testApp.server, testApp.token)
      await api
        .post('/api/v1/work-orders', {
          title: 'Bad assignee',
          assigneeUserId: '00000000-0000-0000-0000-000000000099',
        })
        .expect(400)
    })

    it('rejects invalid asset', async () => {
      const api = authRequest(testApp.server, testApp.token)
      await api
        .post('/api/v1/work-orders', {
          title: 'Bad asset',
          assetId: '00000000-0000-0000-0000-000000000099',
        })
        .expect(404)
    })
  })

  describe('GET /api/v1/work-orders', () => {
    it('lists work orders', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/work-orders').expect(200)

      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThanOrEqual(1)

      const wo = res.body[0]
      expect(wo).toHaveProperty('asset')
      expect(wo).toHaveProperty('assigneeUser')
      expect(wo).toHaveProperty('dispatcherUser')
      expect(wo).toHaveProperty('helpdeskTicket')
    })
  })

  describe('GET /api/v1/work-orders/:id', () => {
    it('returns detail with operational fields', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get(`/api/v1/work-orders/${woId}`).expect(200)

      expect(res.body.id).toBe(woId)
      expect(res.body).toHaveProperty('assetId')
      expect(res.body).toHaveProperty('helpdeskTicketId')
      expect(res.body).toHaveProperty('assigneeUserId')
      expect(res.body).toHaveProperty('dispatcherUserId')
      expect(res.body).toHaveProperty('requesterUserId')
      expect(res.body).toHaveProperty('asset')
      expect(res.body).toHaveProperty('helpdeskTicket')
      expect(res.body).toHaveProperty('assigneeUser')
      expect(res.body).toHaveProperty('dispatcherUser')
      expect(res.body).toHaveProperty('requesterUser')
    })
  })

  describe('PUT /api/v1/work-orders/:id/status', () => {
    it('changes status', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .put(`/api/v1/work-orders/${woId}/status`, { status: 'v_reseni' })
        .expect(200)

      expect(res.body.status).toBe('v_reseni')
    })

    it('sets completedAt on resolve', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .put(`/api/v1/work-orders/${woId}/status`, { status: 'vyresena' })
        .expect(200)

      expect(res.body.status).toBe('vyresena')
      expect(res.body.completedAt).toBeDefined()
    })
  })

  describe('Helpdesk → Work Order flow', () => {
    it('creates a helpdesk ticket', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .post('/api/v1/helpdesk', {
          title: 'Neteče voda v kuchyni',
          priority: 'high',
          category: 'plumbing',
        })
        .expect(201)

      ticketId = res.body.id
      expect(ticketId).toBeDefined()
    })

    it('creates work order from helpdesk ticket', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .post(`/api/v1/helpdesk/${ticketId}/work-orders`, {
          note: 'Vytvořeno z požadavku',
        })
        .expect(201)

      expect(res.body.helpdeskTicketId).toBe(ticketId)
      expect(res.body.title).toBe('Neteče voda v kuchyni')
      expect(res.body.priority).toBe('vysoka') // mapped from 'high'
      expect(res.body.helpdeskTicket).toBeDefined()
      expect(res.body.helpdeskTicket.number).toBeDefined()
    })

    it('lists work orders for ticket', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .get(`/api/v1/helpdesk/${ticketId}/work-orders`)
        .expect(200)

      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBe(1)
      expect(res.body[0].helpdeskTicketId).toBe(ticketId)
    })

    it('rejects create from nonexistent ticket', async () => {
      const api = authRequest(testApp.server, testApp.token)
      await api
        .post('/api/v1/helpdesk/00000000-0000-0000-0000-000000000000/work-orders', {})
        .expect(404)
    })
  })
})
