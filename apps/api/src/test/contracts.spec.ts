import {
  createTestApp,
  closeTestApp,
  authRequest,
  TestApp,
} from './test.helpers'

describe('Contracts (e2e)', () => {
  let testApp: TestApp
  let api: ReturnType<typeof authRequest>
  let propertyId: string
  let unitId: string
  let residentId: string
  let contractId: string

  beforeAll(async () => {
    testApp = await createTestApp()
    api = authRequest(testApp.server, testApp.token)

    const propRes = await api
      .post('/api/v1/properties', {
        name: `Contracts Test ${Date.now()}`,
        address: 'Smluvní 1',
        city: 'Praha',
        postalCode: '110 00',
        type: 'SVJ',
        ownership: 'pronajem',
      })
      .expect(201)
    propertyId = propRes.body.id

    const unitRes = await api
      .post(`/api/v1/properties/${propertyId}/units`, { name: 'Byt pro smlouvu' })
      .expect(201)
    unitId = unitRes.body.id

    const resRes = await api
      .post('/api/v1/residents', {
        firstName: 'Nájemce',
        lastName: `Smluvní ${Date.now()}`,
        role: 'tenant',
      })
      .expect(201)
    residentId = resRes.body.id
  }, 30_000)

  afterAll(async () => {
    if (residentId) await api.delete(`/api/v1/residents/${residentId}`)
    if (propertyId) await api.delete(`/api/v1/properties/${propertyId}`)
    await closeTestApp(testApp)
  })

  describe('CRUD', () => {
    it('POST /contracts → vytvoření nájemní smlouvy', async () => {
      const res = await api
        .post('/api/v1/contracts', {
          contractType: 'najem',
          propertyId,
          unitId,
          residentId,
          monthlyRent: 15000,
          deposit: 30000,
          startDate: '2026-01-01',
          endDate: '2027-12-31',
        })
        .expect(201)
      expect(res.body).toHaveProperty('id')
      expect(res.body.contractType).toBe('najem')
      expect(Number(res.body.monthlyRent)).toBe(15000)
      contractId = res.body.id
    })

    it('GET /contracts → seznam', async () => {
      const res = await api.get('/api/v1/contracts').expect(200)
      expect(res.body).toBeDefined()
    })

    it('GET /contracts/stats → statistiky', async () => {
      const res = await api.get('/api/v1/contracts/stats').expect(200)
      expect(res.body).toBeDefined()
    })

    it('GET /contracts/:id → detail', async () => {
      if (!contractId) return
      const res = await api
        .get(`/api/v1/contracts/${contractId}`)
        .expect(200)
      expect(res.body.id).toBe(contractId)
    })

    it('PUT /contracts/:id → aktualizace', async () => {
      if (!contractId) return
      const res = await api
        .put(`/api/v1/contracts/${contractId}`, {
          contractType: 'najem',
          propertyId,
          unitId,
          residentId,
          monthlyRent: 16000,
          startDate: '2026-01-01',
          endDate: '2027-12-31',
        })
        .expect(200)
      expect(Number(res.body.monthlyRent)).toBe(16000)
    })

    it('PUT /contracts/:id/terminate → ukončení', async () => {
      if (!contractId) return
      const res = await api
        .put(`/api/v1/contracts/${contractId}/terminate`, {
          terminationNote: 'Výpověď ze strany nájemce',
        })
        .expect(200)
      expect(res.body.status).toBe('ukoncena')
    })
  })

  describe('Contract types', () => {
    const types = ['najem', 'podnajem', 'sluzebni', 'jiny']

    for (const contractType of types) {
      it(`contractType '${contractType}' → 201`, async () => {
        const res = await api
          .post('/api/v1/contracts', {
            contractType,
            propertyId,
            unitId,
            residentId,
            monthlyRent: 10000,
            startDate: '2026-06-01',
          })
          .expect(201)
        expect(res.body.contractType).toBe(contractType)
        await api.delete(`/api/v1/contracts/${res.body.id}`)
      })
    }
  })
})
