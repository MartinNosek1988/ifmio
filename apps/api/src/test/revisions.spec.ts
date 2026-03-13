import request from 'supertest'
import { createTestApp, closeTestApp, authRequest, TestApp } from './test.helpers'
import { PrismaService } from '../prisma/prisma.service'

describe('Revisions & Compliance (e2e)', () => {
  let testApp: TestApp
  let api: ReturnType<typeof authRequest>

  beforeAll(async () => {
    testApp = await createTestApp()
    api = authRequest(testApp.server, testApp.token)
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  // ─── SUBJECTS CRUD ──────────────────────────────────────────

  let subjectId: string

  it('creates a revision subject', async () => {
    const res = await api
      .post('/api/v1/revisions/subjects', {
        name: 'Hlavní rozvaděč',
        category: 'elektro',
        location: '1. PP',
        manufacturer: 'Siemens',
        model: 'SIVACON S8',
        serialNumber: 'SN-001',
      })
      .expect(201)

    expect(res.body.name).toBe('Hlavní rozvaděč')
    expect(res.body.category).toBe('elektro')
    expect(res.body.tenantId).toBe(testApp.tenantId)
    expect(res.body.isActive).toBe(true)
    subjectId = res.body.id
  })

  it('lists subjects scoped to tenant', async () => {
    const res = await api
      .get('/api/v1/revisions/subjects')
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThanOrEqual(1)
    expect(res.body.every((s: any) => s.tenantId === testApp.tenantId)).toBe(true)
  })

  it('returns 401 without auth', async () => {
    await request(testApp.server)
      .get('/api/v1/revisions/subjects')
      .expect(401)
  })

  // ─── TYPES CRUD ─────────────────────────────────────────────

  let typeId: string

  it('creates a revision type', async () => {
    const res = await api
      .post('/api/v1/revisions/types', {
        code: 'ELEKTRO',
        name: 'Elektro revize',
        defaultIntervalDays: 365,
        defaultReminderDaysBefore: 30,
      })
      .expect(201)

    expect(res.body.code).toBe('ELEKTRO')
    expect(res.body.name).toBe('Elektro revize')
    expect(res.body.defaultIntervalDays).toBe(365)
    expect(res.body.isActive).toBe(true)
    typeId = res.body.id
  })

  it('rejects duplicate type code within tenant', async () => {
    await api
      .post('/api/v1/revisions/types', {
        code: 'ELEKTRO',
        name: 'Duplicitní',
      })
      .expect(409)
  })

  it('lists types scoped to tenant', async () => {
    const res = await api
      .get('/api/v1/revisions/types')
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.some((t: any) => t.code === 'ELEKTRO')).toBe(true)
  })

  // ─── PLANS CRUD ─────────────────────────────────────────────

  let planId: string

  it('creates a plan with explicit nextDueAt', async () => {
    const nextDue = new Date()
    nextDue.setDate(nextDue.getDate() + 180)

    const res = await api
      .post('/api/v1/revisions/plans', {
        title: 'Roční elektro revize',
        revisionSubjectId: subjectId,
        revisionTypeId: typeId,
        intervalDays: 365,
        nextDueAt: nextDue.toISOString(),
        isMandatory: true,
      })
      .expect(201)

    expect(res.body.title).toBe('Roční elektro revize')
    expect(res.body.intervalDays).toBe(365)
    expect(res.body.isMandatory).toBe(true)
    expect(res.body.status).toBe('active')
    expect(new Date(res.body.nextDueAt).getTime()).toBeCloseTo(nextDue.getTime(), -3)
    planId = res.body.id
  })

  it('creates a plan with default nextDueAt (now + interval)', async () => {
    const before = Date.now()

    const res = await api
      .post('/api/v1/revisions/plans', {
        title: 'Plán bez data',
        revisionSubjectId: subjectId,
        revisionTypeId: typeId,
        intervalDays: 90,
      })
      .expect(201)

    const nextDue = new Date(res.body.nextDueAt).getTime()
    const expectedMin = before + 90 * 86_400_000 - 5000
    const expectedMax = Date.now() + 90 * 86_400_000 + 5000

    expect(nextDue).toBeGreaterThan(expectedMin)
    expect(nextDue).toBeLessThan(expectedMax)

    // Cleanup
    await api.delete(`/api/v1/revisions/plans/${res.body.id}`).expect(204)
  })

  it('creates a plan from lastPerformedAt + interval', async () => {
    const lastPerformed = new Date('2025-06-01')

    const res = await api
      .post('/api/v1/revisions/plans', {
        title: 'Plán z lastPerformed',
        revisionSubjectId: subjectId,
        revisionTypeId: typeId,
        intervalDays: 365,
        lastPerformedAt: lastPerformed.toISOString(),
      })
      .expect(201)

    const expectedNext = new Date(lastPerformed.getTime() + 365 * 86_400_000)
    expect(new Date(res.body.nextDueAt).toISOString().slice(0, 10))
      .toBe(expectedNext.toISOString().slice(0, 10))

    await api.delete(`/api/v1/revisions/plans/${res.body.id}`).expect(204)
  })

  it('rejects plan with missing required fields', async () => {
    await api
      .post('/api/v1/revisions/plans', {
        title: 'Neplatný',
        // missing revisionSubjectId, revisionTypeId, intervalDays
      })
      .expect(400)
  })

  it('lists plans with pagination', async () => {
    const res = await api
      .get('/api/v1/revisions/plans?limit=10&page=1')
      .expect(200)

    expect(res.body).toHaveProperty('data')
    expect(res.body).toHaveProperty('total')
    expect(res.body).toHaveProperty('page')
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
  })

  it('gets plan detail with compliance status', async () => {
    const res = await api
      .get(`/api/v1/revisions/plans/${planId}`)
      .expect(200)

    expect(res.body.id).toBe(planId)
    expect(res.body.complianceStatus).toBeDefined()
    expect(['compliant', 'due_soon', 'overdue']).toContain(res.body.complianceStatus)
    expect(res.body.revisionSubject).toBeDefined()
    expect(res.body.revisionType).toBeDefined()
  })

  it('returns 404 for non-existent plan', async () => {
    await api
      .get('/api/v1/revisions/plans/00000000-0000-0000-0000-000000000000')
      .expect(404)
  })

  // ─── COMPLIANCE STATUS ──────────────────────────────────────

  it('marks plan as overdue when nextDueAt is in the past', async () => {
    const prisma = testApp.app.get(PrismaService)

    // Set nextDueAt to past
    await prisma.revisionPlan.update({
      where: { id: planId },
      data: { nextDueAt: new Date('2020-01-01') },
    })

    const res = await api
      .get(`/api/v1/revisions/plans/${planId}`)
      .expect(200)

    expect(res.body.complianceStatus).toBe('overdue')
  })

  it('marks plan as due_soon when within reminder window', async () => {
    const prisma = testApp.app.get(PrismaService)

    // Set nextDueAt to 10 days from now (within default 30-day reminder)
    const nextDue = new Date()
    nextDue.setDate(nextDue.getDate() + 10)
    await prisma.revisionPlan.update({
      where: { id: planId },
      data: { nextDueAt: nextDue, reminderDaysBefore: 30 },
    })

    const res = await api
      .get(`/api/v1/revisions/plans/${planId}`)
      .expect(200)

    expect(res.body.complianceStatus).toBe('due_soon')
  })

  it('marks plan as compliant when outside reminder window', async () => {
    const prisma = testApp.app.get(PrismaService)

    // Set nextDueAt to 100 days from now (outside 30-day reminder)
    const nextDue = new Date()
    nextDue.setDate(nextDue.getDate() + 100)
    await prisma.revisionPlan.update({
      where: { id: planId },
      data: { nextDueAt: nextDue, reminderDaysBefore: 30 },
    })

    const res = await api
      .get(`/api/v1/revisions/plans/${planId}`)
      .expect(200)

    expect(res.body.complianceStatus).toBe('compliant')
  })

  it('filters plans by complianceStatus=overdue', async () => {
    const prisma = testApp.app.get(PrismaService)
    await prisma.revisionPlan.update({
      where: { id: planId },
      data: { nextDueAt: new Date('2020-01-01') },
    })

    const res = await api
      .get('/api/v1/revisions/plans?complianceStatus=overdue')
      .expect(200)

    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    expect(res.body.data.every((p: any) => p.complianceStatus === 'overdue')).toBe(true)
  })

  // ─── RECORD EVENT + RECALCULATE nextDueAt ───────────────────

  it('records an event and recalculates nextDueAt', async () => {
    const prisma = testApp.app.get(PrismaService)

    // Reset plan to known state
    await prisma.revisionPlan.update({
      where: { id: planId },
      data: { intervalDays: 365, nextDueAt: new Date('2020-01-01'), lastPerformedAt: null },
    })

    const performedAt = new Date('2026-03-01')

    const res = await api
      .post(`/api/v1/revisions/plans/${planId}/record-event`, {
        resultStatus: 'passed',
        summary: 'Revize proběhla v pořádku',
        performedBy: 'Jan Novák',
        vendorName: 'ElektroServis s.r.o.',
        performedAt: performedAt.toISOString(),
      })
      .expect(201)

    expect(res.body.resultStatus).toBe('passed')
    expect(res.body.summary).toBe('Revize proběhla v pořádku')
    expect(res.body.revisionPlanId).toBe(planId)

    // Verify plan was recalculated
    const planRes = await api
      .get(`/api/v1/revisions/plans/${planId}`)
      .expect(200)

    const expectedNext = new Date(performedAt.getTime() + 365 * 86_400_000)
    expect(new Date(planRes.body.nextDueAt).toISOString().slice(0, 10))
      .toBe(expectedNext.toISOString().slice(0, 10))
    expect(new Date(planRes.body.lastPerformedAt).toISOString().slice(0, 10))
      .toBe(performedAt.toISOString().slice(0, 10))
  })

  it('record-event defaults to performedAt=now and resultStatus=passed', async () => {
    const before = Date.now()

    const res = await api
      .post(`/api/v1/revisions/plans/${planId}/record-event`, {
        summary: 'Quick record',
      })
      .expect(201)

    expect(res.body.resultStatus).toBe('passed')
    const performed = new Date(res.body.performedAt).getTime()
    expect(performed).toBeGreaterThanOrEqual(before - 5000)
    expect(performed).toBeLessThanOrEqual(Date.now() + 5000)
  })

  it('returns plan history sorted by performedAt desc', async () => {
    const res = await api
      .get(`/api/v1/revisions/plans/${planId}/history`)
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThanOrEqual(2) // from previous tests

    // Verify descending order
    for (let i = 1; i < res.body.length; i++) {
      const prev = res.body[i - 1].performedAt
      const curr = res.body[i].performedAt
      if (prev && curr) {
        expect(new Date(prev).getTime()).toBeGreaterThanOrEqual(new Date(curr).getTime())
      }
    }
  })

  // ─── UPDATE PLAN interval recalculation ─────────────────────

  it('recalculates nextDueAt when intervalDays changes', async () => {
    // Plan has lastPerformedAt from the record-event test above
    const planBefore = await api
      .get(`/api/v1/revisions/plans/${planId}`)
      .expect(200)

    const lastPerformed = planBefore.body.lastPerformedAt
    expect(lastPerformed).toBeTruthy()

    // Change interval to 180 days
    const res = await api
      .patch(`/api/v1/revisions/plans/${planId}`, { intervalDays: 180 })
      .expect(200)

    const expectedNext = new Date(new Date(lastPerformed).getTime() + 180 * 86_400_000)
    expect(new Date(res.body.nextDueAt).toISOString().slice(0, 10))
      .toBe(expectedNext.toISOString().slice(0, 10))
  })

  // ─── EVENTS CRUD ────────────────────────────────────────────

  let eventId: string

  it('creates a standalone event', async () => {
    const res = await api
      .post('/api/v1/revisions/events', {
        revisionPlanId: planId,
        scheduledAt: new Date('2026-06-01').toISOString(),
        resultStatus: 'planned',
        summary: 'Plánovaná kontrola',
      })
      .expect(201)

    expect(res.body.resultStatus).toBe('planned')
    expect(res.body.revisionPlanId).toBe(planId)
    eventId = res.body.id
  })

  it('lists events', async () => {
    const res = await api
      .get('/api/v1/revisions/events')
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThanOrEqual(1)
  })

  it('gets event detail', async () => {
    const res = await api
      .get(`/api/v1/revisions/events/${eventId}`)
      .expect(200)

    expect(res.body.id).toBe(eventId)
    expect(res.body.resultStatus).toBe('planned')
  })

  it('deletes an event', async () => {
    await api
      .delete(`/api/v1/revisions/events/${eventId}`)
      .expect(204)

    await api
      .get(`/api/v1/revisions/events/${eventId}`)
      .expect(404)
  })

  // ─── DASHBOARD ──────────────────────────────────────────────

  it('returns dashboard with expected structure', async () => {
    const res = await api
      .get('/api/v1/revisions/dashboard?days=30')
      .expect(200)

    expect(res.body).toHaveProperty('kpi')
    expect(res.body.kpi).toHaveProperty('totalPlans')
    expect(res.body.kpi).toHaveProperty('compliant')
    expect(res.body.kpi).toHaveProperty('dueSoon')
    expect(res.body.kpi).toHaveProperty('overdue')
    expect(res.body.kpi).toHaveProperty('performedInPeriod')

    expect(res.body).toHaveProperty('byType')
    expect(res.body).toHaveProperty('byProperty')
    expect(res.body).toHaveProperty('upcoming')
    expect(res.body).toHaveProperty('topRisk')

    expect(Array.isArray(res.body.byType)).toBe(true)
    expect(Array.isArray(res.body.upcoming)).toBe(true)
    expect(Array.isArray(res.body.topRisk)).toBe(true)

    expect(typeof res.body.kpi.totalPlans).toBe('number')
    expect(res.body.kpi.totalPlans).toBeGreaterThanOrEqual(1)
  })

  it('dashboard performedInPeriod counts recent events', async () => {
    const res = await api
      .get('/api/v1/revisions/dashboard?days=30')
      .expect(200)

    // We recorded events in previous tests
    expect(res.body.kpi.performedInPeriod).toBeGreaterThanOrEqual(1)
  })

  // ─── TENANT ISOLATION ───────────────────────────────────────

  it('isolates data between tenants', async () => {
    // Create a second tenant
    const regRes = await request(testApp.server)
      .post('/api/v1/auth/register')
      .send({
        tenantName: `Tenant2 ${Date.now()}`,
        name: 'User 2',
        email: `tenant2-${Date.now()}@test.cz`,
        password: 'testpass123',
      })
      .expect(201)

    const api2 = authRequest(testApp.server, regRes.body.accessToken)

    // Tenant 2 should see no subjects, types, or plans
    const subjects = await api2.get('/api/v1/revisions/subjects').expect(200)
    expect(subjects.body).toHaveLength(0)

    const types = await api2.get('/api/v1/revisions/types').expect(200)
    expect(types.body).toHaveLength(0)

    const plans = await api2.get('/api/v1/revisions/plans').expect(200)
    expect(plans.body.data).toHaveLength(0)

    // Tenant 2 should not access tenant 1's plan
    await api2.get(`/api/v1/revisions/plans/${planId}`).expect(404)

    // Dashboard should be empty
    const dash = await api2.get('/api/v1/revisions/dashboard?days=30').expect(200)
    expect(dash.body.kpi.totalPlans).toBe(0)
  })

  // ─── CLEANUP ────────────────────────────────────────────────

  it('deletes plan', async () => {
    await api.delete(`/api/v1/revisions/plans/${planId}`).expect(204)
    await api.get(`/api/v1/revisions/plans/${planId}`).expect(404)
  })

  it('deletes type and subject', async () => {
    await api.delete(`/api/v1/revisions/types/${typeId}`).expect(204)
    await api.delete(`/api/v1/revisions/subjects/${subjectId}`).expect(204)
  })
})
