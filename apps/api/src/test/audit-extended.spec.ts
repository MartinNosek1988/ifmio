import request from 'supertest'
import {
  createTestApp,
  closeTestApp,
  authRequest,
  TestApp,
} from './test.helpers'

describe('Audit Extended (e2e)', () => {
  let testApp: TestApp
  let api: ReturnType<typeof authRequest>

  beforeAll(async () => {
    testApp = await createTestApp()
    api = authRequest(testApp.server, testApp.token)

    // Vytvoř property aby audit log měl alespoň jeden záznam
    await api
      .post('/api/v1/properties', {
        name: `Audit Test Property ${Date.now()}`,
        address: 'Auditní 1',
        city: 'Praha',
        postalCode: '110 00',
        type: 'bytdum',
        ownership: 'vlastnictvi',
      })
      .expect(201)
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  describe('GET /api/v1/audit', () => {
    it('vrátí seznam audit logů', async () => {
      const res = await api.get('/api/v1/audit').expect(200)
      const body = Array.isArray(res.body) ? res.body : res.body.data || []
      expect(body.length).toBeGreaterThanOrEqual(1)
    })

    it('filtr podle entity', async () => {
      const res = await api
        .get('/api/v1/audit?entity=property')
        .expect(200)
      const body = Array.isArray(res.body) ? res.body : res.body.data || []
      if (body.length > 0) {
        expect(body.every((l: any) => l.entity === 'property')).toBe(true)
      }
    })

    it('filtr podle action', async () => {
      const res = await api
        .get('/api/v1/audit?action=create')
        .expect(200)
      const body = Array.isArray(res.body) ? res.body : res.body.data || []
      if (body.length > 0) {
        expect(body.every((l: any) => l.action === 'create')).toBe(true)
      }
    })

    it('filtr podle date range', async () => {
      const res = await api
        .get('/api/v1/audit?dateFrom=2026-01-01&dateTo=2026-12-31')
        .expect(200)
      expect(res.body).toBeDefined()
    })
  })

  describe('GET /api/v1/audit/entities', () => {
    it('vrátí distinct entity values', async () => {
      const res = await api.get('/api/v1/audit/entities').expect(200)
      expect(Array.isArray(res.body)).toBe(true)
    })
  })

  describe('Audit log integrity', () => {
    it('po vytvoření property existuje audit záznam', async () => {
      const propRes = await api
        .post('/api/v1/properties', {
          name: `Audit Verify ${Date.now()}`,
          address: 'Ověřovací 1',
          city: 'Brno',
          postalCode: '602 00',
          type: 'roddum',
          ownership: 'vlastnictvi',
        })
        .expect(201)

      // Počkejme chvíli na async interceptor
      await new Promise((r) => setTimeout(r, 500))

      const auditRes = await api
        .get(`/api/v1/audit?entity=property&action=create`)
        .expect(200)

      const body = Array.isArray(auditRes.body)
        ? auditRes.body
        : auditRes.body.data || []
      const match = body.find(
        (l: any) => l.entityId === propRes.body.id,
      )
      expect(match).toBeDefined()

      await api.delete(`/api/v1/properties/${propRes.body.id}`)
    })
  })

  describe('Role-based access', () => {
    it('viewer nemůže přistoupit k audit logu → 403', async () => {
      const email = `viewer-audit-${Date.now()}@test.cz`
      await api
        .post('/api/v1/admin/users', {
          name: 'Audit Viewer',
          email,
          role: 'viewer',
          password: 'ViewerPass123',
        })
        .expect(201)

      const loginRes = await request(testApp.server)
        .post('/api/v1/auth/login')
        .send({ email, password: 'ViewerPass123' })
        .expect(200)

      const viewerApi = authRequest(testApp.server, loginRes.body.accessToken)
      await viewerApi.get('/api/v1/audit').expect(403)
    })
  })
})
