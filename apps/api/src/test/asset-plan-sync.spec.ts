import request from 'supertest'
import { createTestApp, closeTestApp, authRequest, TestApp } from './test.helpers'

describe('Asset Plan Sync — P7.1b (e2e)', () => {
  let testApp: TestApp
  let api: ReturnType<typeof authRequest>

  beforeAll(async () => {
    testApp = await createTestApp()
    api = authRequest(testApp.server, testApp.token)
  }, 60_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  let assetTypeId: string
  let revisionTypeId: string
  let assetId: string
  let assetNoTypeId: string

  // ─── Setup ──────────────────────────────────────────────────────

  it('creates a revision type for plan sync tests', async () => {
    const res = await api
      .post('/api/v1/revisions/types', {
        code: `SYNC_TEST_${Date.now()}`,
        name: 'Servis kotle — sync test',
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
        name: `Kotel sync test ${Date.now()}`,
        code: `KOTEL_SYNC_${Date.now()}`,
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

  // ─── Auto-create on asset creation ────────────────────────────

  it('creating asset with assetTypeId auto-creates plans', async () => {
    const res = await api
      .post('/api/v1/assets', {
        name: 'Kotel pro sync test',
        category: 'tzb',
        assetTypeId,
      })
      .expect(201)

    assetId = res.body.id

    // Give async instantiation a moment to complete
    await new Promise((r) => setTimeout(r, 300))

    // Plans should exist for this asset
    const plansRes = await api
      .get(`/api/v1/revisions/plans?assetId=${assetId}`)
      .expect(200)

    expect(plansRes.body.total).toBeGreaterThanOrEqual(1)
    const plan = plansRes.body.data[0]
    expect(plan.generatedFromAssetType).toBe(true)
    expect(plan.isCustomized).toBe(false)
    expect(plan.assetId).toBe(assetId)
  }, 10_000)

  it('creating same asset again does not duplicate plans (idempotent sync)', async () => {
    // Execute sync explicitly — should skip existing plans
    const syncRes = await api
      .post(`/api/v1/assets/${assetId}/sync-plans`, { skipCustomized: true })
      .expect(201)

    expect(syncRes.body.created).toBe(0)
    expect(syncRes.body.skipped).toBeGreaterThanOrEqual(1)

    // Confirm no duplicates
    const plansRes = await api
      .get(`/api/v1/revisions/plans?assetId=${assetId}`)
      .expect(200)

    const uniqueTypes = new Set(plansRes.body.data.map((p: any) => p.revisionTypeId))
    expect(uniqueTypes.size).toBe(plansRes.body.data.length)
  })

  it('creating asset without assetTypeId creates no auto-plans', async () => {
    const res = await api
      .post('/api/v1/assets', {
        name: 'Asset bez typu',
        category: 'ostatni',
      })
      .expect(201)

    assetNoTypeId = res.body.id

    await new Promise((r) => setTimeout(r, 300))

    const plansRes = await api
      .get(`/api/v1/revisions/plans?assetId=${assetNoTypeId}`)
      .expect(200)

    expect(plansRes.body.total).toBe(0)
  }, 10_000)

  // ─── Preview ──────────────────────────────────────────────────

  it('preview-sync returns correct action labels', async () => {
    // All plans already exist → all should be skip_exists
    const res = await api
      .get(`/api/v1/assets/${assetId}/sync-plans/preview`)
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThanOrEqual(1)

    const item = res.body.find((i: any) => i.revisionTypeId === revisionTypeId)
    expect(item).toBeTruthy()
    expect(item.action).toBe('skip_exists')
    expect(item.effectiveIntervalDays).toBe(180) // override applied
  })

  it('sync-plans preview returns 400 for asset without assetTypeId', async () => {
    await api
      .get(`/api/v1/assets/${assetNoTypeId}/sync-plans/preview`)
      .expect(400)
  })

  // ─── isCustomized marking ─────────────────────────────────────

  it('updating interval on auto-generated plan marks it as customized', async () => {
    const plansRes = await api
      .get(`/api/v1/revisions/plans?assetId=${assetId}`)
      .expect(200)

    const plan = plansRes.body.data[0]
    expect(plan.generatedFromAssetType).toBe(true)
    expect(plan.isCustomized).toBe(false)

    await api
      .patch(`/api/v1/revisions/plans/${plan.id}`, {
        intervalDays: 90, // different from 180
      })
      .expect(200)

    const updatedRes = await api
      .get(`/api/v1/revisions/plans/${plan.id}`)
      .expect(200)

    expect(updatedRes.body.isCustomized).toBe(true)
    expect(updatedRes.body.intervalDays).toBe(90)
  })

  it('preview shows skip_customized after plan is marked customized', async () => {
    const res = await api
      .get(`/api/v1/assets/${assetId}/sync-plans/preview`)
      .expect(200)

    const item = res.body.find((i: any) => i.revisionTypeId === revisionTypeId)
    expect(item).toBeTruthy()
    expect(item.action).toBe('skip_customized')
    expect(item.existingPlanIsCustomized).toBe(true)
  })

  it('execute sync with skipCustomized=true skips customized plans', async () => {
    const syncRes = await api
      .post(`/api/v1/assets/${assetId}/sync-plans`, { skipCustomized: true })
      .expect(201)

    expect(syncRes.body.skippedCustomized).toBeGreaterThanOrEqual(1)
    expect(syncRes.body.created).toBe(0)
  })

  // ─── Tenant isolation ─────────────────────────────────────────

  it('cannot trigger sync for asset from another tenant', async () => {
    const reg = await request(testApp.server)
      .post('/api/v1/auth/register')
      .send({
        tenantName: `Other Tenant Sync ${Date.now()}`,
        name: 'Other User',
        email: `other_sync_${Date.now()}@test.cz`,
        password: 'testpass123',
      })

    const otherApi = authRequest(testApp.server, reg.body.accessToken)

    // Try to call sync on assetId from first tenant
    await otherApi
      .get(`/api/v1/assets/${assetId}/sync-plans/preview`)
      .expect(404)
  }, 15_000)
})
