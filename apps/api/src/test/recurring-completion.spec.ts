import { createTestApp, closeTestApp, authRequest, TestApp } from './test.helpers'

describe('Recurring Plan Completion Callback (e2e)', () => {
  let testApp: TestApp

  beforeAll(async () => {
    testApp = await createTestApp()
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  describe('from_completion mode advancement', () => {
    let planId: string
    let ticketId: string

    it('creates a from_completion plan and generates a ticket', async () => {
      const api = authRequest(testApp.server, testApp.token)

      // Create from_completion plan with past nextPlannedAt
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const plan = await api.post('/api/v1/recurring-plans', {
        title: 'Roční revize kotle',
        scheduleMode: 'from_completion',
        frequencyUnit: 'year',
        frequencyInterval: 1,
        nextPlannedAt: yesterday.toISOString(),
      }).expect(201)

      planId = plan.body.id
      expect(plan.body.scheduleMode).toBe('from_completion')

      // Generate ticket
      await api.post('/api/v1/recurring-plans/generate').expect(201)

      // Find generated ticket
      const tickets = await api.get('/api/v1/helpdesk?search=revize+kotle').expect(200)
      const gen = tickets.body.data.find((t: any) => t.recurringPlanId === planId)
      expect(gen).toBeDefined()
      ticketId = gen.id
    })

    it('resolving the ticket advances the plan', async () => {
      const api = authRequest(testApp.server, testApp.token)

      // Get plan before
      const before = await api.get(`/api/v1/recurring-plans/${planId}`).expect(200)
      const oldNextPlanned = before.body.nextPlannedAt

      // Resolve the ticket
      await api.put(`/api/v1/helpdesk/${ticketId}`, { status: 'resolved' }).expect(200)

      // Wait briefly for async callback
      // callback is awaited synchronously

      // Check plan was advanced
      const after = await api.get(`/api/v1/recurring-plans/${planId}`).expect(200)
      expect(after.body.lastCompletedAt).toBeTruthy()
      expect(after.body.nextPlannedAt).not.toBe(oldNextPlanned)
      // next should be ~1 year from now
      const nextDate = new Date(after.body.nextPlannedAt)
      expect(nextDate.getFullYear()).toBeGreaterThanOrEqual(new Date().getFullYear())
    })

    it('resolving again does NOT double-advance (idempotent)', async () => {
      const api = authRequest(testApp.server, testApp.token)

      const before = await api.get(`/api/v1/recurring-plans/${planId}`).expect(200)
      const nextBefore = before.body.nextPlannedAt

      // Try to resolve again (already resolved, but test idempotence)
      await api.put(`/api/v1/helpdesk/${ticketId}`, { status: 'closed' }).expect(200)
      // callback is awaited synchronously

      const after = await api.get(`/api/v1/recurring-plans/${planId}`).expect(200)
      expect(after.body.nextPlannedAt).toBe(nextBefore)
    })
  })

  describe('calendar mode NOT affected', () => {
    it('resolving a calendar-mode ticket does NOT shift nextPlannedAt', async () => {
      const api = authRequest(testApp.server, testApp.token)

      // Create calendar plan
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() - 1)
      const plan = await api.post('/api/v1/recurring-plans', {
        title: 'Denní kontrola',
        scheduleMode: 'calendar',
        frequencyUnit: 'day',
        frequencyInterval: 1,
        nextPlannedAt: tomorrow.toISOString(),
      }).expect(201)

      // Generate ticket
      await api.post('/api/v1/recurring-plans/generate').expect(201)

      const tickets = await api.get('/api/v1/helpdesk?search=Denní+kontrola').expect(200)
      const gen = tickets.body.data.find((t: any) => t.recurringPlanId === plan.body.id)
      expect(gen).toBeDefined()

      // Get plan state (nextPlannedAt already advanced by generator)
      const before = await api.get(`/api/v1/recurring-plans/${plan.body.id}`).expect(200)
      const nextBefore = before.body.nextPlannedAt

      // Resolve ticket
      await api.put(`/api/v1/helpdesk/${gen.id}`, { status: 'resolved' }).expect(200)
      // callback is awaited synchronously

      // nextPlannedAt should NOT change (calendar mode — already advanced by generator)
      const after = await api.get(`/api/v1/recurring-plans/${plan.body.id}`).expect(200)
      expect(after.body.nextPlannedAt).toBe(nextBefore)
      // But lastCompletedAt should be set
      expect(after.body.lastCompletedAt).toBeTruthy()
    }, 15_000)
  })

  describe('non-recurring tickets', () => {
    it('resolving a manual ticket does nothing to plans', async () => {
      const api = authRequest(testApp.server, testApp.token)

      const ticket = await api.post('/api/v1/helpdesk', {
        title: 'Manual ticket',
        priority: 'low',
      }).expect(201)

      // Should not throw
      await api.put(`/api/v1/helpdesk/${ticket.body.id}`, { status: 'resolved' }).expect(200)
    })
  })
})
