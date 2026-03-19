import request from 'supertest'
import { createTestApp, closeTestApp, authRequest, TestApp } from './test.helpers'

describe('Asset Types & Activity Assignments (e2e)', () => {
  let testApp: TestApp
  let api: ReturnType<typeof authRequest>

  beforeAll(async () => {
    testApp = await createTestApp()
    api = authRequest(testApp.server, testApp.token)
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  // ─── ASSET TYPE CRUD ─────────────────────────────────────────

  let assetTypeId: string

  it('creates an asset type', async () => {
    const res = await api
      .post('/api/v1/asset-types', {
        name: 'Plynový kotel',
        code: 'KOTEL_PLYN',
        category: 'kotelna',
        description: 'Plynový kotel pro vytápění',
        manufacturer: 'Buderus',
      })
      .expect(201)

    expect(res.body.name).toBe('Plynový kotel')
    expect(res.body.code).toBe('KOTEL_PLYN')
    expect(res.body.category).toBe('kotelna')
    expect(res.body.tenantId).toBe(testApp.tenantId)
    expect(res.body.isActive).toBe(true)
    assetTypeId = res.body.id
  })

  it('lists asset types scoped to tenant', async () => {
    const res = await api
      .get('/api/v1/asset-types')
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThanOrEqual(1)
    expect(res.body.every((at: any) => at.tenantId === testApp.tenantId)).toBe(true)
  })

  it('gets asset type by ID', async () => {
    const res = await api
      .get(`/api/v1/asset-types/${assetTypeId}`)
      .expect(200)

    expect(res.body.id).toBe(assetTypeId)
    expect(res.body.name).toBe('Plynový kotel')
  })

  it('updates an asset type', async () => {
    const res = await api
      .patch(`/api/v1/asset-types/${assetTypeId}`, {
        description: 'Plynový kotel — aktualizováno',
      })
      .expect(200)

    expect(res.body.description).toBe('Plynový kotel — aktualizováno')
  })

  it('prevents duplicate code in same tenant', async () => {
    await api
      .post('/api/v1/asset-types', {
        name: 'Duplicate Test',
        code: 'KOTEL_PLYN',
      })
      .expect(409)
  })

  // ─── ACTIVITY TEMPLATE ASSIGNMENTS ────────────────────────────

  let revisionTypeId: string
  let assignmentId: string

  it('creates a revision type for assignment testing', async () => {
    const res = await api
      .post('/api/v1/revisions/types', {
        code: `AT_TEST_${Date.now()}`,
        name: 'Roční servis kotle',
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

  it('assigns activity template to asset type', async () => {
    const res = await api
      .post(`/api/v1/asset-types/${assetTypeId}/activity-templates`, {
        revisionTypeId,
        isRequired: true,
        intervalDaysOverride: 180,
        note: 'Override na 180 dní',
      })
      .expect(201)

    expect(res.body.assetTypeId).toBe(assetTypeId)
    expect(res.body.revisionTypeId).toBe(revisionTypeId)
    expect(res.body.isRequired).toBe(true)
    expect(res.body.intervalDaysOverride).toBe(180)
    expect(res.body.revisionType.name).toBe('Roční servis kotle')
    assignmentId = res.body.id
  })

  it('prevents duplicate assignment of same template', async () => {
    await api
      .post(`/api/v1/asset-types/${assetTypeId}/activity-templates`, {
        revisionTypeId,
      })
      .expect(409)
  })

  it('lists assignments for asset type', async () => {
    const res = await api
      .get(`/api/v1/asset-types/${assetTypeId}/activity-templates`)
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBe(1)
    expect(res.body[0].revisionType.code).toBeTruthy()
  })

  it('updates assignment overrides', async () => {
    const res = await api
      .patch(`/api/v1/asset-types/${assetTypeId}/activity-templates/${assignmentId}`, {
        intervalDaysOverride: 90,
        requiresProtocolOverride: false,
      })
      .expect(200)

    expect(res.body.intervalDaysOverride).toBe(90)
    expect(res.body.requiresProtocolOverride).toBe(false)
  })

  // ─── PREVIEW PLANS ────────────────────────────────────────────

  it('preview-plans returns effective merged values', async () => {
    const res = await api
      .get(`/api/v1/asset-types/${assetTypeId}/preview-plans`)
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBe(1)

    const rule = res.body[0]
    expect(rule.effectiveIntervalDays).toBe(90) // overridden from 365
    expect(rule.effectiveReminderDays).toBe(30) // default from RevisionType
    expect(rule.effectiveGraceDays).toBe(14) // default from RevisionType
    expect(rule.effectiveRequiresProtocol).toBe(false) // overridden from true
    expect(rule.effectiveRequiresSupplierSignature).toBe(true) // default
    expect(rule.effectiveRequiresCustomerSignature).toBe(false) // default
    expect(rule.isRequired).toBe(true)
    expect(rule.code).toBeTruthy()
    expect(rule.name).toBe('Roční servis kotle')
  })

  // ─── ASSET WITH ASSET TYPE ────────────────────────────────────

  it('creates asset with assetTypeId', async () => {
    const res = await api
      .post('/api/v1/assets', {
        name: 'Kotel Buderus GB162',
        category: 'tzb',
        assetTypeId,
      })
      .expect(201)

    expect(res.body.assetTypeId).toBe(assetTypeId)
    expect(res.body.assetType).toBeTruthy()
    expect(res.body.assetType.code).toBe('KOTEL_PLYN')
  })

  it('creates asset without assetTypeId (backward compat)', async () => {
    const res = await api
      .post('/api/v1/assets', {
        name: 'Nějaké zařízení',
        category: 'ostatni',
      })
      .expect(201)

    expect(res.body.assetTypeId).toBeNull()
  })

  // ─── DELETE SAFETY ────────────────────────────────────────────

  it('cannot delete asset type with linked assets', async () => {
    await api
      .delete(`/api/v1/asset-types/${assetTypeId}`)
      .expect(409)
  })

  // ─── ASSIGNMENT REMOVAL ───────────────────────────────────────

  it('removes assignment', async () => {
    await api
      .delete(`/api/v1/asset-types/${assetTypeId}/activity-templates/${assignmentId}`)
      .expect(204)

    const res = await api
      .get(`/api/v1/asset-types/${assetTypeId}/activity-templates`)
      .expect(200)

    expect(res.body.length).toBe(0)
  })

  // ─── TENANT ISOLATION ────────────────────────────────────────

  it('cannot assign assetType from another tenant to asset', async () => {
    // Create a second tenant
    const reg = await request(testApp.server)
      .post('/api/v1/auth/register')
      .send({
        tenantName: `Other Tenant ${Date.now()}`,
        name: 'Other User',
        email: `other${Date.now()}@test.cz`,
        password: 'Testpass123',
      })

    const otherApi = authRequest(testApp.server, reg.body.accessToken)

    // Try to create asset with assetTypeId from first tenant
    const res = await otherApi
      .post('/api/v1/assets', {
        name: 'Cross-tenant test',
        category: 'ostatni',
        assetTypeId,
      })
      .expect(404)
  }, 15_000)
})
