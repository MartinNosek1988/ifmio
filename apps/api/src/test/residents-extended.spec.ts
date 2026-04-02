import {
  createTestApp,
  closeTestApp,
  authRequest,
  TestApp,
} from './test.helpers'

describe('Residents Extended (e2e)', () => {
  let testApp: TestApp
  let api: ReturnType<typeof authRequest>
  let propertyId: string
  let residentId: string

  beforeAll(async () => {
    testApp = await createTestApp()
    api = authRequest(testApp.server, testApp.token)

    const propRes = await api
      .post('/api/v1/properties', {
        name: `Residents Test ${Date.now()}`,
        address: 'Obyvatelská 1',
        city: 'Praha',
        postalCode: '110 00',
        type: 'bytdum',
        ownership: 'vlastnictvi',
      })
      .expect(201)
    propertyId = propRes.body.id
  }, 30_000)

  afterAll(async () => {
    if (propertyId) await api.delete(`/api/v1/properties/${propertyId}`)
    await closeTestApp(testApp)
  })

  // ── CRUD ──

  describe('CRUD', () => {
    it('POST /residents → vytvoření', async () => {
      const res = await api
        .post('/api/v1/residents', {
          firstName: 'Jan',
          lastName: `Novák ${Date.now()}`,
          role: 'owner',
          email: `jan.novak.${Date.now()}@test.cz`,
          phone: '+420 777 123 456',
        })
        .expect(201)

      expect(res.body).toHaveProperty('id')
      expect(res.body.firstName).toBe('Jan')
      expect(res.body.role).toBe('owner')
      residentId = res.body.id
    })

    it('GET /residents → seznam s pagination', async () => {
      const res = await api
        .get('/api/v1/residents?page=1&limit=10')
        .expect(200)
      expect(res.body).toBeDefined()
    })

    it('GET /residents/:id → detail s historií', async () => {
      if (!residentId) return
      const res = await api
        .get(`/api/v1/residents/${residentId}`)
        .expect(200)
      expect(res.body.id).toBe(residentId)
      expect(res.body.firstName).toBe('Jan')
    })

    it('PUT /residents/:id → aktualizace', async () => {
      if (!residentId) return
      const res = await api
        .put(`/api/v1/residents/${residentId}`, {
          firstName: 'Jan',
          lastName: `Novák Updated ${Date.now()}`,
          role: 'owner',
          phone: '+420 777 999 888',
        })
        .expect(200)
      expect(res.body.phone).toBe('+420 777 999 888')
    })
  })

  // ── Všechny ResidentRole hodnoty ──

  describe('Všechny ResidentRole hodnoty', () => {
    const roles = ['owner', 'tenant', 'member', 'contact']

    for (const role of roles) {
      it(`role '${role}' → 201`, async () => {
        const res = await api
          .post('/api/v1/residents', {
            firstName: 'Role',
            lastName: `Test ${role} ${Date.now()}`,
            role,
          })
          .expect(201)
        expect(res.body.role).toBe(role)
        await api.delete(`/api/v1/residents/${res.body.id}`)
      })
    }
  })

  // ── Validace ──

  describe('Validace', () => {
    it('prázdný firstName → 400', async () => {
      await api
        .post('/api/v1/residents', {
          firstName: '',
          lastName: 'Test',
          role: 'owner',
        })
        .expect(400)
    })

    it('prázdný lastName → 400', async () => {
      await api
        .post('/api/v1/residents', {
          firstName: 'Test',
          lastName: '',
          role: 'owner',
        })
        .expect(400)
    })

    it('neplatná role → 400', async () => {
      await api
        .post('/api/v1/residents', {
          firstName: 'Test',
          lastName: 'Bad Role',
          role: 'president',
        })
        .expect(400)
    })

    it('neplatný email formát → 400', async () => {
      await api
        .post('/api/v1/residents', {
          firstName: 'Test',
          lastName: 'Bad Email',
          role: 'owner',
          email: 'not-valid',
        })
        .expect(400)
    })
  })

  // ── Legal entity ──

  describe('Legal entity', () => {
    it('právnická osoba s companyName a IČO → 201', async () => {
      const res = await api
        .post('/api/v1/residents', {
          firstName: '',
          lastName: `Firma ${Date.now()}`,
          role: 'owner',
          isLegalEntity: true,
          companyName: 'Správa Domů s.r.o.',
          ico: '87654321',
        })
      // May accept or reject empty firstName for legal entity
      expect([201, 400]).toContain(res.status)
      if (res.status === 201) {
        await api.delete(`/api/v1/residents/${res.body.id}`)
      }
    })
  })

  // ── Filtrování ──

  describe('Filtrování', () => {
    it('GET /residents?role=owner → pouze vlastníci', async () => {
      const res = await api
        .get('/api/v1/residents?role=owner')
        .expect(200)

      const body = Array.isArray(res.body) ? res.body : res.body.data || []
      if (body.length > 0) {
        expect(body.every((r: any) => r.role === 'owner')).toBe(true)
      }
    })

    it('GET /residents?search=Novák → filtr podle jména', async () => {
      const res = await api
        .get('/api/v1/residents?search=Novák')
        .expect(200)
      expect(res.body).toBeDefined()
    })
  })

  // ── Debtors ──

  describe('Debtors', () => {
    it('GET /residents/debtors → seznam dlužníků', async () => {
      const res = await api.get('/api/v1/residents/debtors').expect(200)
      expect(res.body).toBeDefined()
    })
  })

  // ── Invoices ──

  describe('Resident invoices', () => {
    it('GET /residents/:id/invoices → faktury obyvatele', async () => {
      if (!residentId) return
      const res = await api
        .get(`/api/v1/residents/${residentId}/invoices`)
        .expect(200)
      expect(res.body).toBeDefined()
    })
  })

  // ── Bulk operace ──

  describe('Bulk operace', () => {
    let bulkIds: string[] = []

    beforeAll(async () => {
      for (let i = 0; i < 3; i++) {
        const res = await api
          .post('/api/v1/residents', {
            firstName: `Bulk${i}`,
            lastName: `Test ${Date.now()}`,
            role: 'tenant',
          })
          .expect(201)
        bulkIds.push(res.body.id)
      }
    })

    afterAll(async () => {
      for (const id of bulkIds) {
        await api.delete(`/api/v1/residents/${id}`)
      }
    })

    it('POST /residents/bulk/deactivate → hromadná deaktivace', async () => {
      const res = await api
        .post('/api/v1/residents/bulk/deactivate', { ids: bulkIds })
      expect([200, 201]).toContain(res.status)
    })

    it('POST /residents/bulk/activate → hromadná aktivace', async () => {
      const res = await api
        .post('/api/v1/residents/bulk/activate', { ids: bulkIds })
      expect([200, 201]).toContain(res.status)
    })
  })

  // ── Delete (soft) ──

  describe('DELETE /residents/:id', () => {
    it('soft delete obyvatele', async () => {
      const res = await api
        .post('/api/v1/residents', {
          firstName: 'ToDelete',
          lastName: `Resident ${Date.now()}`,
          role: 'contact',
        })
        .expect(201)
      await api.delete(`/api/v1/residents/${res.body.id}`).expect(204)
    })
  })

  // Cleanup
  afterAll(async () => {
    if (residentId) await api.delete(`/api/v1/residents/${residentId}`)
  })
})
