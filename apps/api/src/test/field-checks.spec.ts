import request from 'supertest'
import { createTestApp, closeTestApp, authRequest, TestApp } from './test.helpers'

describe('Field Checks & QR Scan Events (e2e)', () => {
  let testApp: TestApp
  let api: ReturnType<typeof authRequest>
  let assetId: string

  beforeAll(async () => {
    testApp = await createTestApp()
    api = authRequest(testApp.server, testApp.token)

    const res = await api
      .post('/api/v1/assets', { name: 'Kotel Field Check Test', category: 'tzb' })
      .expect(201)
    assetId = res.body.id
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  // ─── Scan Events ─────────────────────────────────────────────────

  let scanEventId: string

  it('logs a QR scan event', async () => {
    const res = await api
      .post(`/api/v1/assets/${assetId}/scan-events`)
      .send({ outcome: 'resolved', source: 'qr_scan', appVersion: '1.0' })
      .expect(201)

    expect(res.body.id).toBeTruthy()
    expect(res.body.outcome).toBe('resolved')
    expect(res.body.source).toBe('qr_scan')
    expect(res.body.scannedAt).toBeTruthy()
    scanEventId = res.body.id
  })

  it('logs scan event with GPS coordinates', async () => {
    const res = await api
      .post(`/api/v1/assets/${assetId}/scan-events`)
      .send({
        outcome: 'resolved',
        source: 'qr_scan',
        latitude: 50.0755,
        longitude: 14.4378,
        accuracyMeters: 5.0,
      })
      .expect(201)

    expect(res.body.id).toBeTruthy()
  })

  it('lists scan events for asset', async () => {
    const res = await api.get(`/api/v1/assets/${assetId}/scan-events`).expect(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.total).toBeGreaterThanOrEqual(2)
    const ids: string[] = res.body.data.map((e: any) => e.id)
    expect(ids).toContain(scanEventId)
  })

  it('returns 404 for scan events on unknown asset', async () => {
    await api.get('/api/v1/assets/nonexistent-id/scan-events').expect(404)
  })

  // ─── Field Check Executions ───────────────────────────────────────

  let checkId: string

  it('creates field check with QR + checklist signals', async () => {
    const res = await api
      .post(`/api/v1/assets/${assetId}/field-checks?scanEventId=${scanEventId}`)
      .send({
        checkType: 'daily_check',
        result: 'ok',
        notes: 'Vše v pořádku',
        signals: [
          { signalType: 'qr_scan', isValid: true, payloadJson: { scanEventId } },
          {
            signalType: 'checklist',
            isValid: true,
            payloadJson: { items: [{ id: 'visible', label: 'Viditelně v pořádku', checked: true }] },
          },
        ],
      })
      .expect(201)

    expect(res.body.id).toBeTruthy()
    expect(res.body.result).toBe('ok')
    expect(res.body.status).toBe('completed')
    expect(res.body.confidenceScore).toBeGreaterThan(0)
    expect(res.body.signals.length).toBeGreaterThanOrEqual(2)
    checkId = res.body.id
  })

  it('computes high confidence with QR + GPS + checklist', async () => {
    const res = await api
      .post(`/api/v1/assets/${assetId}/field-checks`)
      .send({
        checkType: 'inspection',
        result: 'ok',
        signals: [
          { signalType: 'qr_scan', isValid: true, payloadJson: {} },
          { signalType: 'gps', isValid: true, payloadJson: { latitude: 50.07, longitude: 14.43, accuracyMeters: 3 } },
          { signalType: 'checklist', isValid: true, payloadJson: { items: [] } },
          { signalType: 'reading', isValid: true, payloadJson: { value: '72°C' } },
        ],
      })
      .expect(201)

    expect(res.body.confidenceLevel).toBe('high')
    expect(res.body.confidenceScore).toBeGreaterThanOrEqual(70)
  })

  it('computes low confidence with no signals', async () => {
    const res = await api
      .post(`/api/v1/assets/${assetId}/field-checks`)
      .send({
        checkType: 'daily_check',
        result: 'issue_found',
        signals: [],
      })
      .expect(201)

    expect(res.body.confidenceLevel).toBe('low')
    expect(res.body.confidenceScore).toBe(0)
  })

  it('lists field checks for asset', async () => {
    const res = await api.get(`/api/v1/assets/${assetId}/field-checks`).expect(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.total).toBeGreaterThanOrEqual(1)
    const ids: string[] = res.body.data.map((c: any) => c.id)
    expect(ids).toContain(checkId)
  })

  it('gets single field check by id', async () => {
    const res = await api.get(`/api/v1/field-checks/${checkId}`).expect(200)
    expect(res.body.id).toBe(checkId)
    expect(res.body.result).toBe('ok')
    expect(res.body.signals.length).toBeGreaterThanOrEqual(2)
  })

  it('returns 404 for unknown check id', async () => {
    await api.get('/api/v1/field-checks/00000000-0000-0000-0000-000000000000').expect(404)
  })

  it('creates check with issue_found result', async () => {
    const res = await api
      .post(`/api/v1/assets/${assetId}/field-checks`)
      .send({
        checkType: 'inspection',
        result: 'issue_found',
        notes: 'Netěsnost na přírubě',
        signals: [
          { signalType: 'qr_scan', isValid: true, payloadJson: {} },
        ],
      })
      .expect(201)

    expect(res.body.result).toBe('issue_found')
    expect(res.body.notes).toBe('Netěsnost na přírubě')
  })

  it('creates check without result (started status)', async () => {
    const res = await api
      .post(`/api/v1/assets/${assetId}/field-checks`)
      .send({ checkType: 'daily_check', signals: [] })
      .expect(201)

    expect(res.body.status).toBe('started')
    expect(res.body.result).toBeNull()
    expect(res.body.completedAt).toBeNull()
  })

  // ─── Tenant isolation ─────────────────────────────────────────────

  it('cannot access field checks of asset from another tenant', async () => {
    const reg = await request(testApp.server)
      .post('/api/v1/auth/register')
      .send({
        tenantName: `FC Other Tenant ${Date.now()}`,
        name: 'FC Other User',
        email: `fc_other_${Date.now()}@test.cz`,
        password: 'testpass123',
      })

    const otherApi = authRequest(testApp.server, reg.body.accessToken)
    await otherApi.get(`/api/v1/assets/${assetId}/field-checks`).expect(404)
    await otherApi.get(`/api/v1/assets/${assetId}/scan-events`).expect(404)
  }, 15_000)
})
