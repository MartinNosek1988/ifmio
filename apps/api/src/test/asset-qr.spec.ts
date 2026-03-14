import request from 'supertest'
import { createTestApp, closeTestApp, authRequest, TestApp } from './test.helpers'

describe('Asset QR Codes (e2e)', () => {
  let testApp: TestApp
  let api: ReturnType<typeof authRequest>
  let assetId: string

  beforeAll(async () => {
    testApp = await createTestApp()
    api = authRequest(testApp.server, testApp.token)

    // Create a test asset
    const res = await api
      .post('/api/v1/assets', { name: 'Kotel QR Test', category: 'tzb' })
      .expect(201)
    assetId = res.body.id
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  // ─── No QR initially ─────────────────────────────────────────

  it('returns no active QR initially', async () => {
    const res = await api.get(`/api/v1/assets/${assetId}/qr`).expect(200)
    expect(res.body.active).toBe(false)
  })

  // ─── Create QR ────────────────────────────────────────────────

  let activeToken: string
  let humanCode: string

  it('creates QR for asset', async () => {
    const res = await api.post(`/api/v1/assets/${assetId}/qr`).expect(200)

    expect(res.body.assetId).toBe(assetId)
    expect(res.body.status).toBe('active')
    expect(res.body.token).toHaveLength(32)
    expect(res.body.humanCode).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/)
    expect(res.body.qrImageDataUrl).toMatch(/^data:image\/png;base64,/)
    expect(res.body.printedAt).toBeNull()

    activeToken = res.body.token
    humanCode = res.body.humanCode
  })

  it('returns same QR on repeated POST (idempotent)', async () => {
    const res = await api.post(`/api/v1/assets/${assetId}/qr`).expect(200)
    expect(res.body.token).toBe(activeToken)
  })

  it('GET /assets/:id/qr returns active QR', async () => {
    const res = await api.get(`/api/v1/assets/${assetId}/qr`).expect(200)
    expect(res.body.token).toBe(activeToken)
    expect(res.body.humanCode).toBe(humanCode)
    expect(res.body.status).toBe('active')
  })

  // ─── Resolve token (public) ───────────────────────────────────

  it('resolves active token to assetId', async () => {
    const res = await api.get(`/api/v1/qr/${activeToken}`).expect(200)
    expect(res.body.assetId).toBe(assetId)
    expect(res.body.status).toBe('active')
  })

  it('returns invalid for unknown token', async () => {
    const res = await api.get('/api/v1/qr/00000000000000000000000000000000').expect(200)
    expect(res.body.status).toBe('disabled')
    expect(res.body.message).toBeTruthy()
  })

  it('returns invalid for malformed token (not 32 hex)', async () => {
    const res = await api.get('/api/v1/qr/undefined').expect(200)
    expect(res.body.status).toBe('disabled')
    expect(res.body.assetId).toBe('')
  })

  // ─── Reissue ──────────────────────────────────────────────────

  let newToken: string

  it('reissues QR without body (empty request)', async () => {
    // Regression: body must be optional — must not throw on missing dto.notes
    const res = await api.post(`/api/v1/assets/${assetId}/qr/reissue`).expect(200)
    expect(res.body.status).toBe('active')
    // Roll back: create fresh active QR so the next reissue test starts clean
    // (this reissue already replaced activeToken — that's fine, chain continues)
    newToken = res.body.token
  })

  it('reissues QR and deactivates previous', async () => {
    const res = await api.post(`/api/v1/assets/${assetId}/qr/reissue`).expect(200)

    expect(res.body.status).toBe('active')
    expect(res.body.token).not.toBe(activeToken)
    expect(res.body.humanCode).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/)
    newToken = res.body.token
  })

  it('old token is now replaced status', async () => {
    const res = await api.get(`/api/v1/qr/${activeToken}`).expect(200)
    expect(res.body.status).toBe('replaced')
    expect(res.body.message).toMatch(/nahrazen/)
  })

  it('new token resolves correctly', async () => {
    const res = await api.get(`/api/v1/qr/${newToken}`).expect(200)
    expect(res.body.assetId).toBe(assetId)
    expect(res.body.status).toBe('active')
  })

  // ─── Mark printed ─────────────────────────────────────────────

  it('marks QR as printed', async () => {
    const res = await api.post(`/api/v1/assets/${assetId}/qr/mark-printed`).expect(200)
    expect(res.body.printedAt).not.toBeNull()
  })

  // ─── History ──────────────────────────────────────────────────

  it('history lists all QR codes for asset', async () => {
    const res = await api.get(`/api/v1/assets/${assetId}/qr/history`).expect(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThanOrEqual(2)

    const statuses: string[] = res.body.map((q: any) => q.status)
    expect(statuses).toContain('active')
    expect(statuses).toContain('replaced')
  })

  // ─── PDF label ────────────────────────────────────────────────

  it('generates PDF label', async () => {
    const res = await api.get(`/api/v1/assets/${assetId}/qr/label.pdf`).expect(200)
    expect(res.headers['content-type']).toContain('application/pdf')
    expect(res.headers['content-disposition']).toContain('.pdf')
    expect((res as any).body.length).toBeGreaterThan(1000)
  })

  // ─── Tenant isolation ─────────────────────────────────────────

  it('cannot access QR of asset from another tenant', async () => {
    const reg = await request(testApp.server)
      .post('/api/v1/auth/register')
      .send({
        tenantName: `Other QR Tenant ${Date.now()}`,
        name: 'Other User',
        email: `other_qr_${Date.now()}@test.cz`,
        password: 'testpass123',
      })

    const otherApi = authRequest(testApp.server, reg.body.accessToken)
    await otherApi.get(`/api/v1/assets/${assetId}/qr`).expect(404)
  }, 15_000)
})
