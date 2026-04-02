import {
  createTestApp,
  closeTestApp,
  authRequest,
  TestApp,
} from './test.helpers'

describe('Properties Extended (e2e)', () => {
  let testApp: TestApp
  let api: ReturnType<typeof authRequest>
  let propertyId: string

  beforeAll(async () => {
    testApp = await createTestApp()
    api = authRequest(testApp.server, testApp.token)
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  // ── CRUD ──

  describe('POST /api/v1/properties', () => {
    it('vytvoření s kompletními daty → 201', async () => {
      const res = await api
        .post('/api/v1/properties', {
          name: `E2E Bytový dům ${Date.now()}`,
          address: 'Hlavní 42',
          city: 'Praha',
          postalCode: '110 00',
          type: 'bytdum',
          ownership: 'vlastnictvi',
          ico: '12345678',
          dic: 'CZ12345678',
          legalMode: 'SVJ',
        })
        .expect(201)

      expect(res.body).toHaveProperty('id')
      expect(res.body.type).toBe('bytdum')
      expect(res.body.ownership).toBe('vlastnictvi')
      propertyId = res.body.id
    })

    it('prázdný name → 400', async () => {
      await api
        .post('/api/v1/properties', {
          name: '',
          address: 'Test',
          city: 'Praha',
          postalCode: '110 00',
          type: 'bytdum',
          ownership: 'vlastnictvi',
        })
        .expect(400)
    })

    it('neplatný type → 400', async () => {
      await api
        .post('/api/v1/properties', {
          name: 'Bad Type',
          address: 'Test',
          city: 'Praha',
          postalCode: '110 00',
          type: 'neznamy',
          ownership: 'vlastnictvi',
        })
        .expect(400)
    })

    it('neplatný ownership → 400', async () => {
      await api
        .post('/api/v1/properties', {
          name: 'Bad Ownership',
          address: 'Test',
          city: 'Praha',
          postalCode: '110 00',
          type: 'bytdum',
          ownership: 'neplatny',
        })
        .expect(400)
    })
  })

  describe('GET /api/v1/properties', () => {
    it('vrátí seznam nemovitostí', async () => {
      const res = await api.get('/api/v1/properties').expect(200)
      const body = Array.isArray(res.body) ? res.body : res.body.data || []
      expect(body.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('GET /api/v1/properties/:id', () => {
    it('vrátí detail nemovitosti', async () => {
      if (!propertyId) return
      const res = await api
        .get(`/api/v1/properties/${propertyId}`)
        .expect(200)
      expect(res.body.id).toBe(propertyId)
    })

    it('neexistující ID → 404', async () => {
      await api
        .get('/api/v1/properties/00000000-0000-0000-0000-000000000000')
        .expect(404)
    })
  })

  describe('GET /api/v1/properties/:id/nav', () => {
    it('vrátí navigaci (prev/next/total)', async () => {
      if (!propertyId) return
      const res = await api
        .get(`/api/v1/properties/${propertyId}/nav`)
        .expect(200)
      expect(res.body).toHaveProperty('total')
    })
  })

  describe('PATCH /api/v1/properties/:id', () => {
    it('aktualizace name → 200', async () => {
      if (!propertyId) return
      const newName = `Updated Property ${Date.now()}`
      const res = await api
        .patch(`/api/v1/properties/${propertyId}`, { name: newName })
        .expect(200)
      expect(res.body.name).toBe(newName)
    })
  })

  // ── Všechny PropertyType hodnoty ──

  describe('Všechny PropertyType hodnoty', () => {
    const types = ['bytdum', 'roddum', 'komer', 'prumysl', 'pozemek', 'garaz']

    for (const type of types) {
      it(`type '${type}' → 201`, async () => {
        const res = await api
          .post('/api/v1/properties', {
            name: `TypeTest ${type} ${Date.now()}`,
            address: 'Test 1',
            city: 'Brno',
            postalCode: '602 00',
            type,
            ownership: 'vlastnictvi',
          })
          .expect(201)
        expect(res.body.type).toBe(type)
        await api.delete(`/api/v1/properties/${res.body.id}`)
      })
    }
  })

  // ── Všechny OwnershipType hodnoty ──

  describe('Všechny OwnershipType hodnoty', () => {
    const ownerships = ['vlastnictvi', 'druzstvo', 'pronajem']

    for (const ownership of ownerships) {
      it(`ownership '${ownership}' → 201`, async () => {
        const res = await api
          .post('/api/v1/properties', {
            name: `OwnTest ${ownership} ${Date.now()}`,
            address: 'Test 1',
            city: 'Brno',
            postalCode: '602 00',
            type: 'bytdum',
            ownership,
          })
          .expect(201)
        expect(res.body.ownership).toBe(ownership)
        await api.delete(`/api/v1/properties/${res.body.id}`)
      })
    }
  })

  // ── Archivace (soft delete) ──

  describe('DELETE /api/v1/properties/:id', () => {
    it('archivace property', async () => {
      const res = await api
        .post('/api/v1/properties', {
          name: `ToDelete ${Date.now()}`,
          address: 'Smazaná 1',
          city: 'Praha',
          postalCode: '110 00',
          type: 'bytdum',
          ownership: 'vlastnictvi',
        })
        .expect(201)

      await api.delete(`/api/v1/properties/${res.body.id}`).expect(204)
    })
  })

  // Cleanup hlavní property
  afterAll(async () => {
    if (propertyId) await api.delete(`/api/v1/properties/${propertyId}`)
  })
})
