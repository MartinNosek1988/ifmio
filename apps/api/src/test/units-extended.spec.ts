import {
  createTestApp,
  closeTestApp,
  authRequest,
  TestApp,
} from './test.helpers'

describe('Units Extended (e2e)', () => {
  let testApp: TestApp
  let api: ReturnType<typeof authRequest>
  let propertyId: string
  let unitId: string

  beforeAll(async () => {
    testApp = await createTestApp()
    api = authRequest(testApp.server, testApp.token)

    const propRes = await api
      .post('/api/v1/properties', {
        name: `Units Test ${Date.now()}`,
        address: 'Jednotková 1',
        city: 'Praha',
        postalCode: '110 00',
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

  // ── Unit CRUD ──

  describe('Unit CRUD', () => {
    it('POST → vytvoření jednotky', async () => {
      const res = await api
        .post(`/api/v1/properties/${propertyId}/units`, {
          name: `Byt 1 ${Date.now()}`,
          floor: 2,
          area: 55.5,
          spaceType: 'RESIDENTIAL',
        })
        .expect(201)

      expect(res.body).toHaveProperty('id')
      expect(res.body.floor).toBe(2)
      expect(Number(res.body.area)).toBe(55.5)
      unitId = res.body.id
    })

    it('GET → seznam jednotek', async () => {
      const res = await api
        .get(`/api/v1/properties/${propertyId}/units`)
        .expect(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThanOrEqual(1)
    })

    it('GET /:id → detail', async () => {
      if (!unitId) return
      const res = await api
        .get(`/api/v1/properties/${propertyId}/units/${unitId}`)
        .expect(200)
      expect(res.body.id).toBe(unitId)
    })

    it('PUT → aktualizace', async () => {
      if (!unitId) return
      const res = await api
        .put(`/api/v1/properties/${propertyId}/units/${unitId}`, {
          name: `Updated Byt ${Date.now()}`,
          floor: 3,
          area: 60,
        })
        .expect(200)
      expect(res.body.floor).toBe(3)
    })
  })

  // ── SpaceType hodnoty ──

  describe('Všechny SpaceType hodnoty', () => {
    const types = ['RESIDENTIAL', 'NON_RESIDENTIAL', 'GARAGE', 'PARKING', 'CELLAR', 'LAND']

    for (const spaceType of types) {
      it(`spaceType '${spaceType}' → 201`, async () => {
        const res = await api
          .post(`/api/v1/properties/${propertyId}/units`, {
            name: `ST ${spaceType} ${Date.now()}`,
            spaceType,
          })
          .expect(201)
        expect(res.body.spaceType).toBe(spaceType)
        await api.delete(`/api/v1/properties/${propertyId}/units/${res.body.id}`)
      })
    }
  })

  // ── Rooms (Plochy) ──

  describe('Rooms (Plochy)', () => {
    let roomId: string

    it('POST → vytvoření místnosti', async () => {
      if (!unitId) return
      const res = await api
        .post(`/api/v1/properties/${propertyId}/units/${unitId}/rooms`, {
          name: 'Obývací pokoj',
          area: 25.5,
          coefficient: 1.0,
          roomType: 'standard',
        })
        .expect(201)
      expect(res.body).toHaveProperty('id')
      expect(res.body.name).toBe('Obývací pokoj')
      roomId = res.body.id
    })

    it('PUT → aktualizace místnosti', async () => {
      if (!roomId || !unitId) return
      const res = await api
        .put(`/api/v1/properties/${propertyId}/units/${unitId}/rooms/${roomId}`, {
          name: 'Velký obývací pokoj',
          area: 28,
          coefficient: 1.0,
          roomType: 'standard',
        })
        .expect(200)
      expect(res.body.name).toBe('Velký obývací pokoj')
    })

    it('accessory roomType → 201', async () => {
      if (!unitId) return
      const res = await api
        .post(`/api/v1/properties/${propertyId}/units/${unitId}/rooms`, {
          name: 'Sklep',
          area: 5,
          coefficient: 0.1,
          roomType: 'accessory',
        })
        .expect(201)
      expect(res.body.roomType).toBe('accessory')
      await api.delete(`/api/v1/properties/${propertyId}/units/${unitId}/rooms/${res.body.id}`)
    })

    it('DELETE → smazání místnosti', async () => {
      if (!roomId || !unitId) return
      await api
        .delete(`/api/v1/properties/${propertyId}/units/${unitId}/rooms/${roomId}`)
        .expect(204)
    })
  })

  // ── Equipment (Vybavení) ──

  describe('Equipment (Vybavení)', () => {
    let eqId: string

    it('POST → přidání vybavení', async () => {
      if (!unitId) return
      const res = await api
        .post(`/api/v1/properties/${propertyId}/units/${unitId}/equipment`, {
          name: 'Bojler 80L',
          status: 'functional',
          quantity: 1,
          serialNumber: `SN-${Date.now()}`,
        })
        .expect(201)
      expect(res.body).toHaveProperty('id')
      eqId = res.body.id
    })

    it('PUT → aktualizace vybavení', async () => {
      if (!eqId || !unitId) return
      const res = await api
        .put(`/api/v1/properties/${propertyId}/units/${unitId}/equipment/${eqId}`, {
          name: 'Bojler 120L',
          status: 'functional',
          quantity: 1,
        })
        .expect(200)
      expect(res.body.name).toBe('Bojler 120L')
    })

    it('DELETE → smazání vybavení', async () => {
      if (!eqId || !unitId) return
      await api
        .delete(`/api/v1/properties/${propertyId}/units/${unitId}/equipment/${eqId}`)
        .expect(204)
    })
  })

  // ── Quantities (Veličiny) ──

  describe('Quantities (Veličiny)', () => {
    let quantityId: string

    it('POST → upsert veličiny', async () => {
      if (!unitId) return
      const res = await api
        .post(`/api/v1/properties/${propertyId}/units/${unitId}/quantities`, {
          name: 'Počet osob',
          value: 3,
          unitLabel: 'os.',
        })
        .expect(201)
      expect(res.body).toHaveProperty('id')
      quantityId = res.body.id
    })

    it('DELETE → smazání veličiny', async () => {
      if (!quantityId || !unitId) return
      await api
        .delete(`/api/v1/properties/${propertyId}/units/${unitId}/quantities/${quantityId}`)
        .expect(204)
    })
  })

  // ── Management Fees (Poplatky) ──

  describe('Management Fees (Poplatky)', () => {
    let feeId: string

    it('POST → přidání poplatku', async () => {
      if (!unitId) return
      const res = await api
        .post(`/api/v1/properties/${propertyId}/units/${unitId}/management-fees`, {
          amount: 2500,
          calculationType: 'flat',
          validFrom: '2026-01-01',
        })
        .expect(201)
      expect(res.body).toHaveProperty('id')
      expect(Number(res.body.amount)).toBe(2500)
      feeId = res.body.id
    })

    it('PUT → aktualizace poplatku', async () => {
      if (!feeId || !unitId) return
      const res = await api
        .put(`/api/v1/properties/${propertyId}/units/${unitId}/management-fees/${feeId}`, {
          amount: 3000,
          calculationType: 'flat',
          validFrom: '2026-01-01',
        })
        .expect(200)
      expect(Number(res.body.amount)).toBe(3000)
    })

    it('DELETE → smazání poplatku', async () => {
      if (!feeId || !unitId) return
      await api
        .delete(`/api/v1/properties/${propertyId}/units/${unitId}/management-fees/${feeId}`)
        .expect(204)
    })
  })

  // ── Occupancies ──

  describe('Occupancies', () => {
    let residentId: string
    let occupancyId: string

    beforeAll(async () => {
      const resRes = await api
        .post('/api/v1/residents', {
          firstName: 'Petr',
          lastName: `Nájemník ${Date.now()}`,
          role: 'tenant',
        })
        .expect(201)
      residentId = resRes.body.id
    })

    afterAll(async () => {
      if (residentId) await api.delete(`/api/v1/residents/${residentId}`)
    })

    it('POST → přidání obyvatele k jednotce', async () => {
      if (!unitId || !residentId) return
      const res = await api
        .post(`/api/v1/properties/${propertyId}/units/${unitId}/occupancies`, {
          residentId,
          role: 'tenant',
          startDate: '2026-01-01',
        })
        .expect(201)
      expect(res.body).toHaveProperty('id')
      occupancyId = res.body.id
    })

    it('PATCH → ukončení obsazení', async () => {
      if (!occupancyId || !unitId) return
      await api
        .patch(`/api/v1/properties/${propertyId}/units/${unitId}/occupancies/${occupancyId}/end`, {
          endDate: '2026-12-31',
        })
        .expect(200)
    })
  })

  // ── Validace ──

  describe('Validace', () => {
    it('unit s neexistujícím propertyId → 404', async () => {
      await api
        .post('/api/v1/properties/00000000-0000-0000-0000-000000000000/units', {
          name: 'Orphan Unit',
        })
        .expect(404)
    })
  })

  // ── Delete unit ──

  describe('DELETE unit', () => {
    it('smazání jednotky', async () => {
      const res = await api
        .post(`/api/v1/properties/${propertyId}/units`, {
          name: `ToDelete Unit ${Date.now()}`,
        })
        .expect(201)
      await api
        .delete(`/api/v1/properties/${propertyId}/units/${res.body.id}`)
        .expect(204)
    })
  })
})
