import { createTestApp, closeTestApp, authRequest, TestApp } from './test.helpers'
import { PrismaService } from '../prisma/prisma.service'
import { HelpdeskService } from '../helpdesk/helpdesk.service'
import { SLA_POLICY } from '../helpdesk/sla.constants'

describe('Helpdesk SLA (e2e)', () => {
  let testApp: TestApp

  beforeAll(async () => {
    testApp = await createTestApp()
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  // ─── SLA dates on creation ─────────────────────────────────

  it('sets SLA dates based on priority when creating a ticket', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api
      .post('/api/v1/helpdesk', {
        title: 'SLA test - high priority',
        priority: 'high',
      })
      .expect(201)

    expect(res.body.responseDueAt).toBeTruthy()
    expect(res.body.resolutionDueAt).toBeTruthy()
    expect(res.body.escalationLevel).toBe(0)
    expect(res.body.escalatedAt).toBeNull()

    // Verify durations match SLA policy
    const created = new Date(res.body.createdAt).getTime()
    const responseDue = new Date(res.body.responseDueAt).getTime()
    const resolutionDue = new Date(res.body.resolutionDueAt).getTime()

    const responseHoursActual = (responseDue - created) / 3_600_000
    const resolutionHoursActual = (resolutionDue - created) / 3_600_000

    expect(responseHoursActual).toBeCloseTo(SLA_POLICY.high.responseHours, 0)
    expect(resolutionHoursActual).toBeCloseTo(SLA_POLICY.high.resolutionHours, 0)
  })

  it('defaults to medium SLA when no priority specified', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api
      .post('/api/v1/helpdesk', {
        title: 'SLA test - default priority',
      })
      .expect(201)

    const created = new Date(res.body.createdAt).getTime()
    const resolutionDue = new Date(res.body.resolutionDueAt).getTime()
    const resolutionHours = (resolutionDue - created) / 3_600_000

    expect(resolutionHours).toBeCloseTo(SLA_POLICY.medium.resolutionHours, 0)
  })

  it('sets urgent SLA dates correctly', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api
      .post('/api/v1/helpdesk', {
        title: 'SLA test - urgent',
        priority: 'urgent',
      })
      .expect(201)

    const created = new Date(res.body.createdAt).getTime()
    const responseDue = new Date(res.body.responseDueAt).getTime()
    const responseHours = (responseDue - created) / 3_600_000

    expect(responseHours).toBeCloseTo(SLA_POLICY.urgent.responseHours, 0)
  })

  // ─── Priority change recalculates SLA ─────────────────────

  it('recalculates SLA dates when priority changes', async () => {
    const api = authRequest(testApp.server, testApp.token)

    // Create with low priority
    const createRes = await api
      .post('/api/v1/helpdesk', {
        title: 'SLA test - priority change',
        priority: 'low',
      })
      .expect(201)

    const ticketId = createRes.body.id
    const originalResolutionDue = createRes.body.resolutionDueAt

    // Change to urgent
    const updateRes = await api
      .put(`/api/v1/helpdesk/${ticketId}`, { priority: 'urgent' })
      .expect(200)

    expect(updateRes.body.resolutionDueAt).not.toBe(originalResolutionDue)

    // New resolution should be sooner (urgent = 8h vs low = 336h)
    const newResolutionDue = new Date(updateRes.body.resolutionDueAt).getTime()
    const oldResolutionDue = new Date(originalResolutionDue).getTime()
    expect(newResolutionDue).toBeLessThan(oldResolutionDue)
  })

  it('does not recalculate SLA when same priority is sent', async () => {
    const api = authRequest(testApp.server, testApp.token)

    const createRes = await api
      .post('/api/v1/helpdesk', {
        title: 'SLA test - same priority',
        priority: 'medium',
      })
      .expect(201)

    const ticketId = createRes.body.id

    // Update title only, same priority
    const updateRes = await api
      .put(`/api/v1/helpdesk/${ticketId}`, { title: 'Updated title' })
      .expect(200)

    expect(updateRes.body.resolutionDueAt).toBe(createRes.body.resolutionDueAt)
  })

  // ─── First response tracking ──────────────────────────────

  it('tracks firstResponseAt on open → in_progress transition', async () => {
    const api = authRequest(testApp.server, testApp.token)

    const createRes = await api
      .post('/api/v1/helpdesk', {
        title: 'SLA test - first response',
        priority: 'high',
      })
      .expect(201)

    expect(createRes.body.firstResponseAt).toBeNull()

    const updateRes = await api
      .put(`/api/v1/helpdesk/${createRes.body.id}`, { status: 'in_progress' })
      .expect(200)

    expect(updateRes.body.firstResponseAt).toBeTruthy()
    expect(updateRes.body.status).toBe('in_progress')
  })

  it('does not overwrite firstResponseAt on subsequent status changes', async () => {
    const api = authRequest(testApp.server, testApp.token)

    const createRes = await api
      .post('/api/v1/helpdesk', {
        title: 'SLA test - no overwrite firstResponse',
        priority: 'medium',
      })
      .expect(201)

    // Open → in_progress
    const firstUpdate = await api
      .put(`/api/v1/helpdesk/${createRes.body.id}`, { status: 'in_progress' })
      .expect(200)

    const originalFirstResponse = firstUpdate.body.firstResponseAt

    // in_progress → resolved → open → in_progress
    await api
      .put(`/api/v1/helpdesk/${createRes.body.id}`, { status: 'resolved' })
      .expect(200)

    // Re-fetch detail
    const detail = await api
      .get(`/api/v1/helpdesk/${createRes.body.id}`)
      .expect(200)

    expect(detail.body.firstResponseAt).toBe(originalFirstResponse)
  })

  // ─── SLA stats endpoint ───────────────────────────────────

  it('returns SLA stats', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api
      .get('/api/v1/helpdesk/sla-stats')
      .expect(200)

    expect(res.body).toHaveProperty('total')
    expect(res.body).toHaveProperty('overdue')
    expect(res.body).toHaveProperty('escalated')
    expect(res.body).toHaveProperty('dueSoon')
    expect(typeof res.body.total).toBe('number')
  })

  // ─── Overdue/escalated filters ────────────────────────────

  it('filters overdue tickets', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api
      .get('/api/v1/helpdesk?overdue=true')
      .expect(200)

    expect(res.body).toHaveProperty('data')
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('filters escalated tickets', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api
      .get('/api/v1/helpdesk?escalated=true')
      .expect(200)

    expect(res.body).toHaveProperty('data')
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  // ─── Serialization ────────────────────────────────────────

  it('serializes SLA fields as ISO strings in ticket detail', async () => {
    const api = authRequest(testApp.server, testApp.token)

    const createRes = await api
      .post('/api/v1/helpdesk', {
        title: 'SLA serialization test',
        priority: 'high',
      })
      .expect(201)

    const detail = await api
      .get(`/api/v1/helpdesk/${createRes.body.id}`)
      .expect(200)

    // ISO string format check
    expect(detail.body.responseDueAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(detail.body.resolutionDueAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(detail.body.escalatedAt).toBeNull()
    expect(detail.body.firstResponseAt).toBeNull()
  })

  // ─── Escalation logic (unit-level) ────────────────────────

  it('escalateOverdueTickets escalates overdue tickets', async () => {
    const api = authRequest(testApp.server, testApp.token)

    // Create an urgent ticket (1h response, 8h resolution)
    const createRes = await api
      .post('/api/v1/helpdesk', {
        title: 'Escalation test',
        priority: 'urgent',
      })
      .expect(201)

    const ticketId = createRes.body.id

    // Manually set resolutionDueAt to past via direct DB update
    const prisma = testApp.app.get(PrismaService)
    await prisma.helpdeskTicket.update({
      where: { id: ticketId },
      data: { resolutionDueAt: new Date('2020-01-01') },
    })

    // Call escalation via service
    const helpdeskService = testApp.app.get(HelpdeskService)
    const result = await helpdeskService.escalateOverdueTickets()

    expect(result.escalated).toBeGreaterThanOrEqual(1)

    // Verify ticket was escalated
    const detail = await api
      .get(`/api/v1/helpdesk/${ticketId}`)
      .expect(200)

    expect(detail.body.escalationLevel).toBeGreaterThanOrEqual(1)
    expect(detail.body.escalatedAt).toBeTruthy()
  })
})
