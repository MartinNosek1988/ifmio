import {
  createTestApp,
  closeTestApp,
  authRequest,
  TestApp,
} from './test.helpers'

describe('Helpdesk Extended (e2e)', () => {
  let testApp: TestApp
  let api: ReturnType<typeof authRequest>
  let propertyId: string

  beforeAll(async () => {
    testApp = await createTestApp()
    api = authRequest(testApp.server, testApp.token)

    const propRes = await api
      .post('/api/v1/properties', {
        name: `Helpdesk Test ${Date.now()}`,
        address: 'Servisní 1',
        city: 'Praha',
        postalCode: '110 00',
        type: 'bytdum',
        ownership: 'vlastnictvi',
      })
      .expect(201)
    propertyId = propRes.body.id
  }, 30_000)

  afterAll(async () => {
    if (propertyId) await api.delete(`/api/v1/properties/${propertyId}`)
    await closeTestApp(testApp)
  })

  // ── Ticket CRUD ──

  describe('Ticket CRUD', () => {
    let ticketId: string

    it('POST /helpdesk → vytvoření ticketu', async () => {
      const res = await api
        .post('/api/v1/helpdesk', {
          title: `Prasklé potrubí ${Date.now()}`,
          description: 'Teče voda v koupelně',
          propertyId,
          category: 'plumbing',
          priority: 'high',
        })
        .expect(201)

      expect(res.body).toHaveProperty('id')
      expect(res.body).toHaveProperty('number')
      expect(res.body.status).toBe('open')
      expect(res.body.priority).toBe('high')
      expect(res.body.category).toBe('plumbing')
      ticketId = res.body.id
    })

    it('GET /helpdesk → seznam ticketů', async () => {
      const res = await api.get('/api/v1/helpdesk').expect(200)
      expect(res.body).toBeDefined()
    })

    it('GET /helpdesk/:id → detail', async () => {
      if (!ticketId) return
      const res = await api
        .get(`/api/v1/helpdesk/${ticketId}`)
        .expect(200)
      expect(res.body.id).toBe(ticketId)
    })

    it('PUT /helpdesk/:id → aktualizace', async () => {
      if (!ticketId) return
      const res = await api
        .put(`/api/v1/helpdesk/${ticketId}`, {
          title: `Aktualizovaný požadavek ${Date.now()}`,
          description: 'Aktualizovaný popis',
          propertyId,
          category: 'plumbing',
          priority: 'urgent',
        })
        .expect(200)
      expect(res.body.priority).toBe('urgent')
    })

    // ── Lifecycle transitions ──

    it('POST /helpdesk/:id/claim → self-assign', async () => {
      if (!ticketId) return
      const res = await api
        .post(`/api/v1/helpdesk/${ticketId}/claim`, {})
        .expect(201)
      expect(res.body.status).toBe('in_progress')
    })

    it('POST /helpdesk/:id/resolve → quick resolve', async () => {
      if (!ticketId) return
      const res = await api
        .post(`/api/v1/helpdesk/${ticketId}/resolve`, {})
        .expect(201)
      expect(res.body.status).toBe('resolved')
    })

    // ── Protocol ──

    it('POST /helpdesk/:ticketId/protocol → vytvoření protokolu', async () => {
      if (!ticketId) return
      const res = await api
        .post(`/api/v1/helpdesk/${ticketId}/protocol`, {
          workerName: 'Jan Technik',
          note: 'Opraveno, vyměněno potrubí',
        })
      expect([200, 201]).toContain(res.status)
    })

    it('GET /helpdesk/:ticketId/protocol → získání protokolu', async () => {
      if (!ticketId) return
      const res = await api
        .get(`/api/v1/helpdesk/${ticketId}/protocol`)
        .expect(200)
      expect(res.body).toBeDefined()
    })

    // ── Items ──

    it('POST /helpdesk/:ticketId/items → přidání položky', async () => {
      if (!ticketId) return
      const res = await api
        .post(`/api/v1/helpdesk/${ticketId}/items`, {
          description: 'Plastové potrubí DN50',
          unit: 'm',
          quantity: 3,
          unitPrice: 250,
          totalPrice: 750,
        })
        .expect(201)
      expect(res.body).toHaveProperty('id')
    })

    // Cleanup
    afterAll(async () => {
      if (ticketId) await api.delete(`/api/v1/helpdesk/${ticketId}`)
    })
  })

  // ── Validace ──

  describe('Validace', () => {
    it('ticket bez title → 400', async () => {
      await api
        .post('/api/v1/helpdesk', {
          propertyId,
          category: 'general',
          priority: 'low',
        })
        .expect(400)
    })

    it('ticket s neplatnou priority → 400', async () => {
      await api
        .post('/api/v1/helpdesk', {
          title: 'Bad Priority',
          propertyId,
          category: 'general',
          priority: 'super_urgent',
        })
        .expect(400)
    })

    it('ticket s neplatnou category → 400', async () => {
      await api
        .post('/api/v1/helpdesk', {
          title: 'Bad Category',
          propertyId,
          category: 'nuclear_reactor',
          priority: 'low',
        })
        .expect(400)
    })
  })

  // ── Všechny category hodnoty ──

  describe('Všechny category hodnoty', () => {
    const categories = [
      'general',
      'plumbing',
      'electrical',
      'hvac',
      'structural',
      'cleaning',
      'other',
    ]

    for (const category of categories) {
      it(`category '${category}' → 201`, async () => {
        const res = await api
          .post('/api/v1/helpdesk', {
            title: `Cat ${category} ${Date.now()}`,
            propertyId,
            category,
            priority: 'low',
          })
          .expect(201)
        expect(res.body.category).toBe(category)
        await api.delete(`/api/v1/helpdesk/${res.body.id}`)
      })
    }
  })

  // ── Všechny priority hodnoty ──

  describe('Všechny priority hodnoty', () => {
    const priorities = ['low', 'medium', 'high', 'urgent']

    for (const priority of priorities) {
      it(`priority '${priority}' → 201`, async () => {
        const res = await api
          .post('/api/v1/helpdesk', {
            title: `Prio ${priority} ${Date.now()}`,
            propertyId,
            category: 'general',
            priority,
          })
          .expect(201)
        expect(res.body.priority).toBe(priority)
        await api.delete(`/api/v1/helpdesk/${res.body.id}`)
      })
    }
  })

  // ── SLA ──

  describe('SLA', () => {
    it('GET /helpdesk/sla-stats → SLA metriky', async () => {
      const res = await api.get('/api/v1/helpdesk/sla-stats').expect(200)
      expect(res.body).toBeDefined()
    })

    it('GET /helpdesk/sla-policies → seznam SLA politik', async () => {
      const res = await api
        .get('/api/v1/helpdesk/sla-policies')
        .expect(200)
      expect(res.body).toBeDefined()
    })

    it('POST /helpdesk/sla-policies → vytvoření SLA', async () => {
      const res = await api
        .post('/api/v1/helpdesk/sla-policies', {
          propertyId,
          lowResponseH: 48,
          lowResolutionH: 168,
          mediumResponseH: 24,
          mediumResolutionH: 72,
          highResponseH: 4,
          highResolutionH: 24,
          urgentResponseH: 1,
          urgentResolutionH: 8,
        })
        .expect(201)
      expect(res.body).toHaveProperty('id')
    })
  })

  // ── Dashboard ──

  describe('Dashboard', () => {
    it('GET /helpdesk/dashboard → KPI data', async () => {
      const res = await api.get('/api/v1/helpdesk/dashboard').expect(200)
      expect(res.body).toBeDefined()
    })
  })
})
