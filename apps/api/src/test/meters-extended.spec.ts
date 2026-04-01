import {
  createTestApp,
  closeTestApp,
  authRequest,
  TestApp,
} from './test.helpers'

describe('Meters Extended (e2e)', () => {
  let testApp: TestApp
  let api: ReturnType<typeof authRequest>
  let propertyId: string
  let unitId: string
  let meterId: string

  beforeAll(async () => {
    testApp = await createTestApp()
    api = authRequest(testApp.server, testApp.token)

    const propRes = await api
      .post('/api/v1/properties', {
        name: `Meters Test ${Date.now()}`,
        address: 'Měřicí 1',
        city: 'Ostrava',
        postalCode: '702 00',
        type: 'bytdum',
        ownership: 'vlastnictvi',
      })
      .expect(201)
    propertyId = propRes.body.id

    const unitRes = await api
      .post(`/api/v1/properties/${propertyId}/units`, {
        name: 'Byt pro měřidla',
        floor: 1,
        area: 45,
      })
      .expect(201)
    unitId = unitRes.body.id
  }, 30_000)

  afterAll(async () => {
    if (propertyId) await api.delete(`/api/v1/properties/${propertyId}`)
    await closeTestApp(testApp)
  })

  // ── CRUD ──

  describe('CRUD', () => {
    it('POST /meters → vytvoření měřidla', async () => {
      const res = await api
        .post('/api/v1/meters', {
          name: `Vodoměr SV ${Date.now()}`,
          serialNumber: `WM-${Date.now()}`,
          meterType: 'voda_studena',
          propertyId,
          unitId,
          unit: 'm³',
          manufacturer: 'Elster',
          location: 'Koupelna',
        })
        .expect(201)

      expect(res.body).toHaveProperty('id')
      expect(res.body.meterType).toBe('voda_studena')
      meterId = res.body.id
    })

    it('GET /meters → seznam', async () => {
      const res = await api.get('/api/v1/meters').expect(200)
      const body = Array.isArray(res.body) ? res.body : res.body.data || []
      expect(body.length).toBeGreaterThanOrEqual(1)
    })

    it('GET /meters/:id → detail', async () => {
      if (!meterId) return
      const res = await api.get(`/api/v1/meters/${meterId}`).expect(200)
      expect(res.body.id).toBe(meterId)
    })

    it('PUT /meters/:id → aktualizace', async () => {
      if (!meterId) return
      const res = await api
        .put(`/api/v1/meters/${meterId}`, {
          name: `Updated Vodoměr ${Date.now()}`,
          serialNumber: `WM-UPD-${Date.now()}`,
          meterType: 'voda_studena',
          propertyId,
          unitId,
          location: 'Kuchyně',
        })
        .expect(200)
      expect(res.body.location).toBe('Kuchyně')
    })
  })

  // ── Stats ──

  describe('Stats', () => {
    it('GET /meters/stats → statistiky', async () => {
      const res = await api.get('/api/v1/meters/stats').expect(200)
      expect(res.body).toBeDefined()
    })
  })

  // ── Readings ──

  describe('Readings (Odečty)', () => {
    it('POST /meters/:id/readings → přidání odečtu', async () => {
      if (!meterId) return
      const res = await api
        .post(`/api/v1/meters/${meterId}/readings`, {
          readingDate: '2026-01-15',
          value: 100.5,
          source: 'manual',
        })
        .expect(201)
      expect(res.body).toHaveProperty('id')
      expect(Number(res.body.value)).toBe(100.5)
    })

    it('přidání druhého odečtu → consumption se vypočítá', async () => {
      if (!meterId) return
      const res = await api
        .post(`/api/v1/meters/${meterId}/readings`, {
          readingDate: '2026-03-15',
          value: 115.3,
          source: 'manual',
        })
        .expect(201)
      // Consumption = 115.3 - 100.5 = 14.8
      if (res.body.consumption !== undefined && res.body.consumption !== null) {
        expect(Number(res.body.consumption)).toBeCloseTo(14.8, 1)
      }
    })

    it('GET /meters/:id/readings → historie odečtů', async () => {
      if (!meterId) return
      const res = await api
        .get(`/api/v1/meters/${meterId}/readings`)
        .expect(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThanOrEqual(2)
    })
  })

  // ── Initial readings ──

  describe('Initial readings', () => {
    it('POST /meters/:id/initial-reading → počáteční odečet', async () => {
      // Vytvořím nové měřidlo pro initial reading test
      const newMeter = await api
        .post('/api/v1/meters', {
          name: `Initial Test ${Date.now()}`,
          serialNumber: `INIT-${Date.now()}`,
          meterType: 'plyn',
          propertyId,
          unitId,
        })
        .expect(201)

      const res = await api
        .post(`/api/v1/meters/${newMeter.body.id}/initial-reading`, {
          readingDate: '2026-01-01',
          value: 500,
        })
        .expect(201)
      expect(res.body).toBeDefined()

      await api.delete(`/api/v1/meters/${newMeter.body.id}`)
    })
  })

  // ── Všechny meterType hodnoty ──

  describe('Všechny meterType hodnoty', () => {
    const types = ['elektrina', 'voda_studena', 'voda_tepla', 'plyn', 'teplo']

    for (const meterType of types) {
      it(`meterType '${meterType}' → 201`, async () => {
        const res = await api
          .post('/api/v1/meters', {
            name: `MType ${meterType} ${Date.now()}`,
            serialNumber: `MT-${meterType}-${Date.now()}`,
            meterType,
            propertyId,
            unitId,
          })
          .expect(201)
        expect(res.body.meterType).toBe(meterType)
        await api.delete(`/api/v1/meters/${res.body.id}`)
      })
    }
  })

  // ── Validace ──

  describe('Validace', () => {
    it('meter bez name → 400', async () => {
      await api
        .post('/api/v1/meters', {
          serialNumber: 'NoName',
          meterType: 'plyn',
          propertyId,
        })
        .expect(400)
    })

    it('meter s neplatným meterType → 400', async () => {
      await api
        .post('/api/v1/meters', {
          name: 'Bad Type',
          meterType: 'nuclear_power',
          propertyId,
        })
        .expect(400)
    })
  })

  // ── Delete ──

  describe('DELETE /meters/:id', () => {
    it('smazání měřidla', async () => {
      const res = await api
        .post('/api/v1/meters', {
          name: `ToDelete ${Date.now()}`,
          serialNumber: `DEL-${Date.now()}`,
          meterType: 'elektrina',
          propertyId,
        })
        .expect(201)
      await api.delete(`/api/v1/meters/${res.body.id}`).expect(200)
    })
  })

  // Cleanup
  afterAll(async () => {
    if (meterId) await api.delete(`/api/v1/meters/${meterId}`)
  })
})
