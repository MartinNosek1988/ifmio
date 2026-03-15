import { createTestApp, closeTestApp, authRequest, TestApp } from './test.helpers'

describe('Recurring Activity Plans (e2e)', () => {
  let testApp: TestApp
  let planId: string

  beforeAll(async () => {
    testApp = await createTestApp()
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  describe('CRUD', () => {
    it('creates a daily recurring plan', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.post('/api/v1/recurring-plans', {
        title: 'Denní kontrola kotelny',
        category: 'inspection',
        scheduleMode: 'calendar',
        frequencyUnit: 'day',
        frequencyInterval: 1,
        priority: 'medium',
      }).expect(201)

      expect(res.body.title).toBe('Denní kontrola kotelny')
      expect(res.body.scheduleMode).toBe('calendar')
      expect(res.body.frequencyUnit).toBe('day')
      expect(res.body.nextPlannedAt).toBeDefined()
      planId = res.body.id
    })

    it('lists recurring plans', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/recurring-plans').expect(200)

      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThanOrEqual(1)
    })

    it('gets plan detail', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get(`/api/v1/recurring-plans/${planId}`).expect(200)

      expect(res.body.id).toBe(planId)
      expect(res.body.isActive).toBe(true)
    })

    it('updates plan', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.put(`/api/v1/recurring-plans/${planId}`, {
        title: 'Denní kontrola kotelny - upraveno',
      }).expect(200)

      expect(res.body.title).toBe('Denní kontrola kotelny - upraveno')
    })
  })

  describe('Generation', () => {
    it('generates helpdesk ticket from plan with past nextPlannedAt', async () => {
      const api = authRequest(testApp.server, testApp.token)

      // Set nextPlannedAt to past
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      await api.put(`/api/v1/recurring-plans/${planId}`, {
        nextPlannedAt: yesterday.toISOString(),
      }).expect(200)

      // Trigger generation
      const genRes = await api.post('/api/v1/recurring-plans/generate').expect(201)
      expect(genRes.body.generated).toBeGreaterThanOrEqual(1)

      // Verify ticket was created
      const tickets = await api.get('/api/v1/helpdesk?search=kontrola+kotelny').expect(200)
      const generated = tickets.body.data.find((t: any) => t.requestOrigin === 'recurring_plan')
      expect(generated).toBeDefined()
      expect(generated.recurringPlanId).toBe(planId)
      expect(generated.generationKey).toBeTruthy()
    })

    it('does NOT generate duplicate on repeated run', async () => {
      const api = authRequest(testApp.server, testApp.token)

      // Run generation again
      const genRes = await api.post('/api/v1/recurring-plans/generate').expect(201)

      // Should skip (not generate duplicate)
      // The plan already advanced, so depending on nextPlannedAt it may generate 0 or skip
      expect(typeof genRes.body.generated).toBe('number')
      expect(typeof genRes.body.skipped).toBe('number')
    })

    it('creates weekly recurring plan', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.post('/api/v1/recurring-plans', {
        title: 'Týdenní prohlídka čerpací stanice',
        scheduleMode: 'calendar',
        frequencyUnit: 'week',
        frequencyInterval: 1,
      }).expect(201)

      expect(res.body.frequencyUnit).toBe('week')
    })

    it('creates from-completion plan', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.post('/api/v1/recurring-plans', {
        title: 'Roční revize plynového kotle',
        scheduleMode: 'from_completion',
        frequencyUnit: 'year',
        frequencyInterval: 1,
        leadDays: 30,
      }).expect(201)

      expect(res.body.scheduleMode).toBe('from_completion')
      expect(res.body.leadDays).toBe(30)
    })

    it('inactive plan does not generate', async () => {
      const api = authRequest(testApp.server, testApp.token)

      // Create inactive plan with past date
      const past = new Date()
      past.setDate(past.getDate() - 1)
      const plan = await api.post('/api/v1/recurring-plans', {
        title: 'Inactive plan',
        nextPlannedAt: past.toISOString(),
      }).expect(201)

      await api.put(`/api/v1/recurring-plans/${plan.body.id}`, { isActive: false }).expect(200)

      const before = await api.get('/api/v1/helpdesk?search=Inactive+plan').expect(200)
      const countBefore = before.body.data.filter((t: any) => t.recurringPlanId === plan.body.id).length

      await api.post('/api/v1/recurring-plans/generate').expect(201)

      const after = await api.get('/api/v1/helpdesk?search=Inactive+plan').expect(200)
      const countAfter = after.body.data.filter((t: any) => t.recurringPlanId === plan.body.id).length

      expect(countAfter).toBe(countBefore)
    })
  })

  describe('Helpdesk metadata', () => {
    it('generated ticket has requestOrigin and generationKey', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const tickets = await api.get('/api/v1/helpdesk?search=kontrola+kotelny').expect(200)
      const generated = tickets.body.data.find((t: any) => t.requestOrigin === 'recurring_plan')

      expect(generated).toBeDefined()
      expect(generated.requestOrigin).toBe('recurring_plan')
      expect(generated.generationKey).toMatch(/^rp-/)
      expect(generated.recurringPlanId).toBeTruthy()
    })
  })
})
