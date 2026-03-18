import request from 'supertest'
import { createTestApp, closeTestApp, authRequest, TestApp } from './test.helpers'

describe('Asset Passport — GET /assets/:id/passport (e2e)', () => {
  let testApp: TestApp
  let api: ReturnType<typeof authRequest>

  beforeAll(async () => {
    testApp = await createTestApp()
    api = authRequest(testApp.server, testApp.token)
  }, 60_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  let revisionTypeId: string
  let assetTypeId: string
  let assetId: string          // asset with assetTypeId + synced plans
  let assetNoTypeId: string    // asset without assetTypeId
  let planId: string           // plan created by sync for assetId

  // ─── Setup ──────────────────────────────────────────────────────

  it('creates a revision type for passport tests', async () => {
    const res = await api
      .post('/api/v1/revisions/types', {
        code: `PASSPORT_TEST_${Date.now()}`,
        name: 'Servis kotle — passport test',
        defaultIntervalDays: 365,
        defaultReminderDaysBefore: 30,
        requiresProtocol: true,
        requiresSupplierSignature: true,
        requiresCustomerSignature: false,
        graceDaysAfterEvent: 14,
      })
      .expect(201)

    revisionTypeId = res.body.id
  })

  it('creates an asset type with one required assignment', async () => {
    const atRes = await api
      .post('/api/v1/asset-types', {
        name: `Kotel passport test ${Date.now()}`,
        code: `KOTEL_PASSPORT_${Date.now()}`,
        category: 'kotelna',
      })
      .expect(201)

    assetTypeId = atRes.body.id

    await api
      .post(`/api/v1/asset-types/${assetTypeId}/activity-templates`, {
        revisionTypeId,
        isRequired: true,
        intervalDaysOverride: 180,
      })
      .expect(201)
  })

  it('creates an asset without assetTypeId for not_configured test', async () => {
    const res = await api
      .post('/api/v1/assets', {
        name: 'Asset bez typu — passport test',
        category: 'ostatni',
      })
      .expect(201)

    assetNoTypeId = res.body.id
  })

  it('creates an asset with assetTypeId and syncs plans', async () => {
    const res = await api
      .post('/api/v1/assets', {
        name: 'Kotel pro passport test',
        category: 'tzb',
        assetTypeId,
      })
      .expect(201)

    assetId = res.body.id

    // Give async instantiation a moment to complete
    await new Promise((r) => setTimeout(r, 300))

    // Confirm plan was auto-created
    const plansRes = await api
      .get(`/api/v1/revisions/plans?assetId=${assetId}`)
      .expect(200)

    expect(plansRes.body.total).toBeGreaterThanOrEqual(1)
    planId = plansRes.body.data[0].id
  }, 10_000)

  // ─── Compliance status: not_configured ────────────────────────

  it('asset without assetTypeId returns compliance.status = not_configured', async () => {
    const res = await api
      .get(`/api/v1/assets/${assetNoTypeId}/passport`)
      .expect(200)

    expect(res.body.asset).toBeTruthy()
    expect(res.body.asset.id).toBe(assetNoTypeId)
    expect(res.body.compliance).toBeTruthy()
    expect(res.body.compliance.status).toBe('not_configured')
  })

  // ─── Compliance status: missing_plan ──────────────────────────

  it('asset with assetTypeId but missing mandatory plan returns compliance.status = missing_plan', async () => {
    // Create a fresh asset with assetTypeId but do NOT sync plans
    const res = await api
      .post('/api/v1/assets', {
        name: 'Asset s typem bez planů',
        category: 'tzb',
        assetTypeId,
      })
      .expect(201)

    const freshAssetId = res.body.id

    // Wait briefly so auto-sync (if any) would have time — then delete the plan if created
    await new Promise((r) => setTimeout(r, 300))

    // Get plans and delete them to simulate missing mandatory plan
    const plansRes = await api
      .get(`/api/v1/revisions/plans?assetId=${freshAssetId}`)
      .expect(200)

    for (const plan of plansRes.body.data) {
      await api
        .delete(`/api/v1/revisions/plans/${plan.id}`)
        .expect(204)
    }

    const passportRes = await api
      .get(`/api/v1/assets/${freshAssetId}/passport`)
      .expect(200)

    expect(passportRes.body.compliance.status).toBe('missing_plan')
    expect(passportRes.body.compliance.missingMandatoryPlans).toBeGreaterThanOrEqual(1)
  }, 10_000)

  // ─── Compliance status: compliant ─────────────────────────────

  it('after syncing plans, compliance.status becomes compliant', async () => {
    const res = await api
      .get(`/api/v1/assets/${assetId}/passport`)
      .expect(200)

    expect(res.body.compliance.status).toBe('compliant')
    expect(res.body.compliance.totalPlans).toBeGreaterThanOrEqual(1)
    expect(res.body.compliance.activePlans).toBeGreaterThanOrEqual(1)
    expect(res.body.compliance.overduePlans).toBe(0)
    expect(res.body.compliance.missingMandatoryPlans).toBe(0)
  })

  // ─── Compliance status: overdue ───────────────────────────────

  it('asset with overdue mandatory plan returns compliance.status = overdue', async () => {
    // Push nextDueAt to a past date to simulate overdue
    const pastDate = new Date(Date.now() - 30 * 86_400_000).toISOString()

    await api
      .patch(`/api/v1/revisions/plans/${planId}`, {
        nextDueAt: pastDate,
      })
      .expect(200)

    const res = await api
      .get(`/api/v1/assets/${assetId}/passport`)
      .expect(200)

    expect(res.body.compliance.status).toBe('overdue')
    expect(res.body.compliance.overduePlans).toBeGreaterThanOrEqual(1)
  })

  // ─── plansSummary counts ───────────────────────────────────────

  it('passport returns plansSummary with correct counts', async () => {
    const res = await api
      .get(`/api/v1/assets/${assetId}/passport`)
      .expect(200)

    expect(res.body.plansSummary).toBeTruthy()
    expect(typeof res.body.plansSummary.total).toBe('number')
    expect(typeof res.body.plansSummary.autoGenerated).toBe('number')
    expect(typeof res.body.plansSummary.customized).toBe('number')
    expect(typeof res.body.plansSummary.overdue).toBe('number')
    expect(typeof res.body.plansSummary.dueSoon).toBe('number')

    expect(res.body.plansSummary.total).toBeGreaterThanOrEqual(1)
    // The plan was auto-generated from assetType
    expect(res.body.plansSummary.autoGenerated).toBeGreaterThanOrEqual(1)
    // Overdue count should be >= 1 (plan was set to past date above)
    expect(res.body.plansSummary.overdue).toBeGreaterThanOrEqual(1)
  })

  // ─── latestRevision ───────────────────────────────────────────

  it('passport returns latestRevision when a revision event exists', async () => {
    // Record a revision event on the plan
    const eventRes = await api
      .post(`/api/v1/revisions/plans/${planId}/record-event`, {
        performedAt: new Date().toISOString(),
        resultStatus: 'passed',
        notes: 'Passport test revision',
      })
      .expect(201)

    const revisionEventId = eventRes.body.id

    const res = await api
      .get(`/api/v1/assets/${assetId}/passport`)
      .expect(200)

    expect(res.body.latestRevision).toBeTruthy()
    expect(res.body.latestRevision.id).toBe(revisionEventId)
    expect(res.body.latestRevision.revisionTypeName).toBeTruthy()
    expect(res.body.latestRevision.performedAt).toBeTruthy()
    expect(res.body.latestRevision.resultStatus).toBe('passed')
  })

  // ─── nextDue ──────────────────────────────────────────────────

  it('passport returns nextDue pointing to soonest upcoming plan', async () => {
    // Reset the plan's nextDueAt to a future date so it is upcoming
    const futureDate = new Date(Date.now() + 60 * 86_400_000).toISOString()

    await api
      .patch(`/api/v1/revisions/plans/${planId}`, {
        nextDueAt: futureDate,
      })
      .expect(200)

    const res = await api
      .get(`/api/v1/assets/${assetId}/passport`)
      .expect(200)

    expect(res.body.nextDue).toBeTruthy()
    expect(res.body.nextDue.revisionPlanId).toBeTruthy()
    expect(res.body.nextDue.revisionTypeName).toBeTruthy()
    expect(res.body.nextDue.dueAt).toBeTruthy()
    expect(typeof res.body.nextDue.daysUntil).toBe('number')
    expect(res.body.nextDue.daysUntil).toBeGreaterThan(0)

    // Should point to the soonest upcoming plan
    expect(new Date(res.body.nextDue.dueAt).getTime()).toBeGreaterThan(Date.now())
  })

  // ─── 404 for unknown asset ────────────────────────────────────

  it('passport 404 for unknown asset', async () => {
    await api
      .get('/api/v1/assets/00000000-0000-0000-0000-000000000000/passport')
      .expect(404)
  })

  // ─── Tenant isolation ─────────────────────────────────────────

  it('passport 404 for asset from another tenant', async () => {
    const reg = await request(testApp.server)
      .post('/api/v1/auth/register')
      .send({
        tenantName: `Other Tenant Passport ${Date.now()}`,
        name: 'Other User',
        email: `other_passport_${Date.now()}@test.cz`,
        password: 'testpass123',
      })

    const otherApi = authRequest(testApp.server, reg.body.accessToken)

    // Try to access passport for assetId belonging to the first tenant
    await otherApi
      .get(`/api/v1/assets/${assetId}/passport`)
      .expect(404)
  }, 15_000)
})
