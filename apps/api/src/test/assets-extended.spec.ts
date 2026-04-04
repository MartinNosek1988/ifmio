import {
  createTestApp,
  closeTestApp,
  authRequest,
  TestApp,
} from './test.helpers'

describe('Assets Extended (e2e)', () => {
  let testApp: TestApp
  let api: ReturnType<typeof authRequest>
  let propertyId: string
  let assetId: string

  beforeAll(async () => {
    testApp = await createTestApp()
    api = authRequest(testApp.server, testApp.token)

    const propRes = await api
      .post('/api/v1/properties', {
        name: `Assets Test ${Date.now()}`,
        address: 'Majetková 1',
        city: 'Brno',
        postalCode: '602 00',
        type: 'SVJ',
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
    it('POST /assets → vytvoření', async () => {
      const res = await api
        .post('/api/v1/assets', {
          name: `Kotel Viessmann ${Date.now()}`,
          category: 'tzb',
          manufacturer: 'Viessmann',
          model: 'Vitodens 200-W',
          serialNumber: `SN-${Date.now()}`,
          propertyId,
          status: 'aktivni',
          location: 'Kotelna, 1. PP',
        })
        .expect(201)

      expect(res.body).toHaveProperty('id')
      expect(res.body.category).toBe('tzb')
      expect(res.body.manufacturer).toBe('Viessmann')
      assetId = res.body.id
    })

    it('GET /assets → seznam', async () => {
      const res = await api.get('/api/v1/assets').expect(200)
      const body = Array.isArray(res.body) ? res.body : res.body.data || []
      expect(body.length).toBeGreaterThanOrEqual(1)
    })

    it('GET /assets?category=tzb → filtr podle kategorie', async () => {
      const res = await api.get('/api/v1/assets?category=tzb').expect(200)
      const body = Array.isArray(res.body) ? res.body : res.body.data || []
      if (body.length > 0) {
        expect(body.every((a: any) => a.category === 'tzb')).toBe(true)
      }
    })

    it('GET /assets/:id → detail', async () => {
      if (!assetId) return
      const res = await api.get(`/api/v1/assets/${assetId}`).expect(200)
      expect(res.body.id).toBe(assetId)
    })

    it('PATCH /assets/:id → aktualizace', async () => {
      if (!assetId) return
      const res = await api
        .patch(`/api/v1/assets/${assetId}`, {
          location: 'Kotelna, 2. PP',
          notes: 'Přemístěno po rekonstrukci',
        })
        .expect(200)
      expect(res.body.location).toBe('Kotelna, 2. PP')
    })
  })

  // ── Stats & Export ──

  describe('Stats & Export', () => {
    it('GET /assets/stats → statistiky', async () => {
      const res = await api.get('/api/v1/assets/stats').expect(200)
      expect(res.body).toBeDefined()
    })

    it('GET /assets/export → CSV export', async () => {
      const res = await api.get('/api/v1/assets/export').expect(200)
      expect(res.body).toBeDefined()
    })
  })

  // ── Service records ──

  describe('Service records', () => {
    it('POST /assets/:id/services → přidání servisu', async () => {
      if (!assetId) return
      const res = await api
        .post(`/api/v1/assets/${assetId}/services`, {
          date: '2026-03-15',
          type: 'preventivni',
          description: 'Roční revize kotle',
          cost: 5500,
          supplier: 'Servis Teplo s.r.o.',
        })
        .expect(201)
      expect(res.body).toHaveProperty('id')
    })

    it('GET /assets/:id/services → historie servisů', async () => {
      if (!assetId) return
      const res = await api
        .get(`/api/v1/assets/${assetId}/services`)
        .expect(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ── Passport & History ──

  describe('Passport & History', () => {
    it('GET /assets/:id/passport → asset passport', async () => {
      if (!assetId) return
      const res = await api
        .get(`/api/v1/assets/${assetId}/passport`)
        .expect(200)
      expect(res.body).toBeDefined()
    })

    it('GET /assets/:id/revision-history → revizní historie', async () => {
      if (!assetId) return
      const res = await api
        .get(`/api/v1/assets/${assetId}/revision-history`)
        .expect(200)
      expect(res.body).toBeDefined()
    })
  })

  // ── Všechny category hodnoty ──

  describe('Všechny category hodnoty', () => {
    const categories = ['tzb', 'stroje', 'vybaveni', 'vozidla', 'it', 'ostatni']

    for (const category of categories) {
      it(`category '${category}' → 201`, async () => {
        const res = await api
          .post('/api/v1/assets', {
            name: `Cat ${category} ${Date.now()}`,
            category,
            propertyId,
          })
          .expect(201)
        expect(res.body.category).toBe(category)
        await api.delete(`/api/v1/assets/${res.body.id}`)
      })
    }
  })

  // ── Všechny service type hodnoty ──

  describe('Všechny service type hodnoty', () => {
    const types = ['preventivni', 'oprava', 'revize', 'kalibrace']

    for (const type of types) {
      it(`service type '${type}' → 201`, async () => {
        if (!assetId) return
        const res = await api
          .post(`/api/v1/assets/${assetId}/services`, {
            date: '2026-03-20',
            type,
            description: `Test ${type}`,
          })
          .expect(201)
        expect(res.body.type).toBe(type)
      })
    }
  })

  // ── Validace ──

  describe('Validace', () => {
    it('asset bez name → 400', async () => {
      await api
        .post('/api/v1/assets', {
          category: 'tzb',
          propertyId,
        })
        .expect(400)
    })

    it('asset s neplatnou category → 400', async () => {
      await api
        .post('/api/v1/assets', {
          name: 'Bad Category',
          category: 'nuclear_reactor',
          propertyId,
        })
        .expect(400)
    })
  })

  // ── Soft delete ──

  describe('DELETE /assets/:id', () => {
    it('soft delete asset', async () => {
      const res = await api
        .post('/api/v1/assets', {
          name: `ToDelete Asset ${Date.now()}`,
          category: 'ostatni',
          propertyId,
        })
        .expect(201)
      await api.delete(`/api/v1/assets/${res.body.id}`).expect(200)
    })
  })
})
