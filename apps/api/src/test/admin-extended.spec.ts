import request from 'supertest'
import {
  createTestApp,
  closeTestApp,
  authRequest,
  TestApp,
} from './test.helpers'

describe('Admin Extended (e2e)', () => {
  let testApp: TestApp
  let api: ReturnType<typeof authRequest>
  let propertyId: string
  let createdUserId: string

  beforeAll(async () => {
    testApp = await createTestApp()
    api = authRequest(testApp.server, testApp.token)

    const propRes = await api
      .post('/api/v1/properties', {
        name: `Admin Test Property ${Date.now()}`,
        address: 'Testovací 1',
        city: 'Praha',
        postalCode: '110 00',
        type: 'SVJ',
        ownership: 'vlastnictvi',
      })
      .expect(201)
    propertyId = propRes.body.id
  }, 30_000)

  afterAll(async () => {
    if (propertyId) {
      await api.delete(`/api/v1/properties/${propertyId}`)
    }
    await closeTestApp(testApp)
  })

  // ── Správa uživatelů ──

  describe('GET /api/v1/admin/users', () => {
    it('vrátí seznam uživatelů', async () => {
      const res = await api.get('/api/v1/admin/users').expect(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('POST /api/v1/admin/users', () => {
    it('vytvoří nového uživatele (invite)', async () => {
      const email = `invited-${Date.now()}@test.cz`
      const res = await api
        .post('/api/v1/admin/users', {
          name: 'Pozvaný Uživatel',
          email,
          role: 'property_manager',
          password: 'InvitedPass123',
        })
        .expect(201)

      expect(res.body).toHaveProperty('id')
      expect(res.body.email).toBe(email)
      expect(res.body.role).toBe('property_manager')
      createdUserId = res.body.id
    })

    it('duplicitní email → 409', async () => {
      const email = `dup-admin-${Date.now()}@test.cz`
      await api
        .post('/api/v1/admin/users', {
          name: 'First',
          email,
          role: 'viewer',
          password: 'Pass12345',
        })
        .expect(201)

      await api
        .post('/api/v1/admin/users', {
          name: 'Second',
          email,
          role: 'viewer',
          password: 'Pass12345',
        })
        .expect(409)
    })

    it('neplatná role → 400', async () => {
      await api
        .post('/api/v1/admin/users', {
          name: 'Bad Role',
          email: `badrole-${Date.now()}@test.cz`,
          role: 'super_hero',
          password: 'Pass12345',
        })
        .expect(400)
    })
  })

  describe('PATCH /api/v1/admin/users/:id/role', () => {
    it('změní roli uživatele', async () => {
      if (!createdUserId) return
      const res = await api
        .patch(`/api/v1/admin/users/${createdUserId}/role`, {
          role: 'operations',
        })
        .expect(200)
      expect(res.body.role).toBe('operations')
    })
  })

  describe('DELETE /api/v1/admin/users/:id', () => {
    it('deaktivuje uživatele', async () => {
      if (!createdUserId) return
      await api.delete(`/api/v1/admin/users/${createdUserId}`).expect(204)
    })
  })

  // ── Tenant settings ──

  describe('GET /api/v1/admin/tenant', () => {
    it('vrátí tenant info', async () => {
      const res = await api.get('/api/v1/admin/tenant').expect(200)
      expect(res.body).toHaveProperty('id')
      expect(res.body).toHaveProperty('name')
    })
  })

  describe('GET /api/v1/admin/settings', () => {
    it('vrátí nastavení', async () => {
      const res = await api.get('/api/v1/admin/settings').expect(200)
      expect(res.body).toHaveProperty('id')
    })
  })

  describe('PUT /api/v1/admin/settings', () => {
    it('aktualizuje nastavení', async () => {
      const res = await api
        .put('/api/v1/admin/settings', {
          orgName: `Updated Org ${Date.now()}`,
        })
        .expect(200)
      expect(res.body).toHaveProperty('orgName')
    })
  })

  // ── Pozvánky ──

  describe('POST /api/v1/admin/invite', () => {
    it('pošle pozvánku', async () => {
      const res = await api
        .post('/api/v1/admin/invite', {
          email: `invite-${Date.now()}@test.cz`,
          role: 'viewer',
          name: 'Pozvaný',
        })
        .expect(201)
      expect(res.body).toHaveProperty('id')
    })
  })

  describe('GET /api/v1/admin/invitations', () => {
    it('vrátí seznam pozvánek', async () => {
      const res = await api.get('/api/v1/admin/invitations').expect(200)
      expect(Array.isArray(res.body)).toBe(true)
    })
  })

  // ── Property assignments ──

  describe('POST /api/v1/admin/property-assignments', () => {
    it('přiřadí uživatele k nemovitosti', async () => {
      const email = `assign-${Date.now()}@test.cz`
      const userRes = await api
        .post('/api/v1/admin/users', {
          name: 'Assigned User',
          email,
          role: 'property_manager',
          password: 'Pass12345',
        })
        .expect(201)

      await api
        .post('/api/v1/admin/property-assignments', {
          userId: userRes.body.id,
          propertyId,
        })
        .expect(201)
    })
  })

  // ── Onboarding ──

  describe('GET /api/v1/admin/onboarding', () => {
    it('vrátí onboarding status', async () => {
      const res = await api.get('/api/v1/admin/onboarding').expect(200)
      expect(res.body).toBeDefined()
    })
  })

  describe('POST /api/v1/admin/onboarding/dismiss', () => {
    it('dismiss onboarding guide', async () => {
      await api.post('/api/v1/admin/onboarding/dismiss', {}).expect(200)
    })
  })

  // ── Export ──

  describe('GET /api/v1/admin/export', () => {
    it('exportuje tenant data jako JSON', async () => {
      const res = await api.get('/api/v1/admin/export').expect(200)
      expect(res.body).toBeDefined()
    })
  })

  // ── Role autorizace ──

  describe('Role-based access', () => {
    let viewerApi: ReturnType<typeof authRequest>

    beforeAll(async () => {
      const email = `viewer-${Date.now()}@test.cz`
      await api
        .post('/api/v1/admin/users', {
          name: 'Viewer Test',
          email,
          role: 'viewer',
          password: 'ViewerPass123',
        })
        .expect(201)

      const loginRes = await request(testApp.server)
        .post('/api/v1/auth/login')
        .send({ email, password: 'ViewerPass123' })
        .expect(200)
      viewerApi = authRequest(testApp.server, loginRes.body.accessToken)
    }, 15_000)

    it('viewer nemůže přistoupit k /admin/users → 403', async () => {
      await viewerApi.get('/api/v1/admin/users').expect(403)
    })

    it('viewer nemůže zvát uživatele → 403', async () => {
      await viewerApi
        .post('/api/v1/admin/invite', {
          email: 'nope@test.cz',
          role: 'viewer',
          name: 'Nope',
        })
        .expect(403)
    })

    it('viewer nemůže měnit nastavení → 403', async () => {
      await viewerApi
        .put('/api/v1/admin/settings', { orgName: 'Hacked' })
        .expect(403)
    })

    it('viewer nemůže exportovat data → 403', async () => {
      await viewerApi.get('/api/v1/admin/export').expect(403)
    })

    it('operations nemůže spravovat uživatele → 403', async () => {
      const email = `ops-${Date.now()}@test.cz`
      await api
        .post('/api/v1/admin/users', {
          name: 'Ops User',
          email,
          role: 'operations',
          password: 'OpsPass12345',
        })
        .expect(201)

      const loginRes = await request(testApp.server)
        .post('/api/v1/auth/login')
        .send({ email, password: 'OpsPass12345' })
        .expect(200)
      const opsApi = authRequest(testApp.server, loginRes.body.accessToken)

      await opsApi.get('/api/v1/admin/users').expect(403)
    })
  })
})
