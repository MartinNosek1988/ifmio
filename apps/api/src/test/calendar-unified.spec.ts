import { createTestApp, closeTestApp, authRequest, TestApp } from './test.helpers'

describe('Calendar unified feed (e2e)', () => {
  let testApp: TestApp

  beforeAll(async () => {
    testApp = await createTestApp()

    const api = authRequest(testApp.server, testApp.token)

    // Seed: helpdesk ticket with deadline
    await api.post('/api/v1/helpdesk', {
      title: 'Calendar test ticket',
      priority: 'high',
    }).expect(201)

    // Seed: work order with deadline
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    await api.post('/api/v1/work-orders', {
      title: 'Calendar test WO',
      deadline: tomorrow.toISOString(),
    }).expect(201)
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  describe('GET /api/v1/calendar/events', () => {
    it('returns unified feed with calendar events and synthetic items', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/calendar/events').expect(200)

      expect(Array.isArray(res.body)).toBe(true)

      // Should contain at least the work order we created (it has a deadline)
      const woItems = res.body.filter((e: any) => e.source === 'workorder')
      expect(woItems.length).toBeGreaterThanOrEqual(1)
      expect(woItems[0].title).toContain('WO:')
      expect(woItems[0].sourceId).toBeDefined()
    })

    it('includes helpdesk deadlines when tickets have resolutionDueAt', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/calendar/events').expect(200)

      const hdItems = res.body.filter((e: any) => e.source === 'helpdesk')
      // Our seeded ticket has SLA-computed resolutionDueAt
      expect(hdItems.length).toBeGreaterThanOrEqual(1)
      expect(hdItems[0].title).toContain('Požadavek:')
      expect(hdItems[0].sourceId).toBeDefined()
    })

    it('filters by helpdesk eventType', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/calendar/events?eventType=helpdesk').expect(200)

      // All items should be helpdesk source
      for (const item of res.body) {
        expect(item.source).toBe('helpdesk')
      }
    })

    it('filters by workorder eventType', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/calendar/events?eventType=workorder').expect(200)

      for (const item of res.body) {
        expect(item.source).toBe('workorder')
      }
    })

    it('does not include resolved tickets', async () => {
      const api = authRequest(testApp.server, testApp.token)

      // Create and resolve a ticket
      const ticket = await api.post('/api/v1/helpdesk', { title: 'Resolved ticket', priority: 'low' }).expect(201)
      await api.put(`/api/v1/helpdesk/${ticket.body.id}`, { status: 'resolved' }).expect(200)

      const res = await api.get('/api/v1/calendar/events').expect(200)
      const resolvedHd = res.body.filter((e: any) => e.source === 'helpdesk' && e.sourceId === ticket.body.id)
      expect(resolvedHd.length).toBe(0)
    })
  })

  describe('GET /api/v1/calendar/stats', () => {
    it('returns stats including helpdesk count', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/calendar/stats').expect(200)

      expect(res.body).toHaveProperty('helpdesk')
      expect(typeof res.body.helpdesk).toBe('number')
      expect(res.body).toHaveProperty('workorders')
      expect(res.body).toHaveProperty('upcoming')
    })
  })
})
