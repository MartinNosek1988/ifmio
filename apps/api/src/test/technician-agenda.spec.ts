import { createTestApp, closeTestApp, authRequest, TestApp } from './test.helpers'

describe('Technician Agenda (e2e)', () => {
  let testApp: TestApp

  beforeAll(async () => {
    testApp = await createTestApp()
    // Seed: create a WO assigned to the test user
    const api = authRequest(testApp.server, testApp.token)
    const meRes = await api.get('/api/v1/auth/me').expect(200)
    const userId = meRes.body.id

    // WO with today's deadline
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 0) // today
    await api.post('/api/v1/work-orders', {
      title: 'Agenda test - today',
      assigneeUserId: userId,
      deadline: tomorrow.toISOString(),
    }).expect(201)

    // WO with past deadline (overdue)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 2)
    await api.post('/api/v1/work-orders', {
      title: 'Agenda test - overdue',
      assigneeUserId: userId,
      deadline: yesterday.toISOString(),
    }).expect(201)

    // High priority ticket
    await api.post('/api/v1/helpdesk', {
      title: 'Agenda test - urgent ticket',
      priority: 'urgent',
    }).expect(201)
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  describe('GET /api/v1/work-orders/my-agenda', () => {
    it('returns agenda with sections', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/work-orders/my-agenda').expect(200)

      expect(res.body).toHaveProperty('today')
      expect(res.body).toHaveProperty('overdue')
      expect(res.body).toHaveProperty('highPrioTickets')
      expect(res.body).toHaveProperty('overdueTickets')
      expect(res.body).toHaveProperty('counts')

      expect(Array.isArray(res.body.today)).toBe(true)
      expect(Array.isArray(res.body.overdue)).toBe(true)
    })

    it('returns counts', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/work-orders/my-agenda').expect(200)

      expect(typeof res.body.counts.todayWo).toBe('number')
      expect(typeof res.body.counts.overdueWo).toBe('number')
      expect(typeof res.body.counts.highPrioTickets).toBe('number')
      expect(typeof res.body.counts.overdueTickets).toBe('number')
    })

    it('overdue WOs have expected fields', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/work-orders/my-agenda').expect(200)

      if (res.body.overdue.length > 0) {
        const wo = res.body.overdue[0]
        expect(wo).toHaveProperty('id')
        expect(wo).toHaveProperty('title')
        expect(wo).toHaveProperty('status')
        expect(wo).toHaveProperty('priority')
        expect(wo).toHaveProperty('deadline')
      }
    })

    it('only returns items assigned to current user', async () => {
      const api = authRequest(testApp.server, testApp.token)

      // Create a WO NOT assigned to current user
      await api.post('/api/v1/work-orders', {
        title: 'Not my WO',
        // no assigneeUserId
      }).expect(201)

      const res = await api.get('/api/v1/work-orders/my-agenda').expect(200)

      // "Not my WO" should not appear in any section
      const allTitles = [
        ...res.body.today.map((w: any) => w.title),
        ...res.body.overdue.map((w: any) => w.title),
      ]
      expect(allTitles).not.toContain('Not my WO')
    })
  })
})
