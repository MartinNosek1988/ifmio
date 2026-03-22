import request from 'supertest'
import { createTestApp, closeTestApp, authRequest, TestApp } from '../test/test.helpers'

describe('Units (e2e)', () => {
  let testApp: TestApp
  let propertyId: string
  let unitId: string

  beforeAll(async () => {
    testApp = await createTestApp()

    // Create a property to use for unit tests
    const api = authRequest(testApp.server, testApp.token)
    const propRes = await api
      .post('/api/v1/properties', {
        name: `Test Property Units ${Date.now()}`,
        address: 'Testovací 1',
        city: 'Praha',
        postalCode: '10000',
        type: 'bytdum',
        ownership: 'vlastnictvi',
      })
      .expect(201)

    propertyId = propRes.body.id
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  describe('POST /api/v1/properties/:propertyId/units', () => {
    it('creates a unit', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .post(`/api/v1/properties/${propertyId}/units`, {
          name: 'Byt 2+1, 2. patro',
          floor: 2,
          area: 68.5,
          spaceType: 'RESIDENTIAL',
          disposition: '2+1',
        })
        .expect(201)

      expect(res.body).toHaveProperty('id')
      expect(res.body.name).toBe('Byt 2+1, 2. patro')
      expect(res.body.floor).toBe(2)
      expect(res.body.area).toBe(68.5)
      expect(res.body.spaceType).toBe('RESIDENTIAL')
      unitId = res.body.id
    })

    it('creates a non-residential unit', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .post(`/api/v1/properties/${propertyId}/units`, {
          name: 'Garážové stání 1',
          spaceType: 'PARKING',
          area: 15,
        })
        .expect(201)

      expect(res.body.spaceType).toBe('PARKING')
      expect(res.body.area).toBe(15)
    })

    it('rejects unit without required name', async () => {
      const api = authRequest(testApp.server, testApp.token)
      await api
        .post(`/api/v1/properties/${propertyId}/units`, {
          floor: 1,
          area: 50,
        })
        .expect(400)
    })
  })

  describe('GET /api/v1/properties/:propertyId/units', () => {
    it('lists units for a property', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .get(`/api/v1/properties/${propertyId}/units`)
        .expect(200)

      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThanOrEqual(1)
    })

    it('requires authentication', async () => {
      await request(testApp.server)
        .get(`/api/v1/properties/${propertyId}/units`)
        .expect(401)
    })
  })

  describe('GET /api/v1/properties/:propertyId/units/:id', () => {
    it('returns unit detail', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .get(`/api/v1/properties/${propertyId}/units/${unitId}`)
        .expect(200)

      expect(res.body.id).toBe(unitId)
      expect(res.body.name).toBe('Byt 2+1, 2. patro')
      expect(res.body).toHaveProperty('occupancies')
    })

    it('returns 404 for nonexistent unit', async () => {
      const api = authRequest(testApp.server, testApp.token)
      await api
        .get(`/api/v1/properties/${propertyId}/units/00000000-0000-0000-0000-000000000000`)
        .expect(404)
    })
  })

  describe('PUT /api/v1/properties/:propertyId/units/:id', () => {
    it('updates unit fields', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .put(`/api/v1/properties/${propertyId}/units/${unitId}`, {
          name: 'Byt 2+1, 2. patro – renovovaný',
          area: 70,
          personCount: 3,
        })
        .expect(200)

      expect(res.body.name).toBe('Byt 2+1, 2. patro – renovovaný')
      expect(res.body.area).toBe(70)
      expect(res.body.personCount).toBe(3)
    })

    it('returns 404 when updating nonexistent unit', async () => {
      const api = authRequest(testApp.server, testApp.token)
      await api
        .put(`/api/v1/properties/${propertyId}/units/00000000-0000-0000-0000-000000000000`, {
          name: 'Ghost Unit',
        })
        .expect(404)
    })
  })

  describe('POST /api/v1/properties/:propertyId/units/:unitId/occupancies', () => {
    it('adds an occupancy to a unit', async () => {
      const api = authRequest(testApp.server, testApp.token)

      // Create a resident first
      const residentRes = await api
        .post('/api/v1/residents', {
          firstName: 'Tenant',
          lastName: 'ForUnit',
          role: 'tenant',
        })
        .expect(201)
      const residentId = residentRes.body.id

      const res = await api
        .post(`/api/v1/properties/${propertyId}/units/${unitId}/occupancies`, {
          residentId,
          role: 'tenant',
          startDate: '2024-01-01',
          isPrimaryPayer: true,
        })
        .expect(201)

      expect(res.body).toHaveProperty('id')
      expect(res.body.residentId).toBe(residentId)
      expect(res.body.role).toBe('tenant')
    })

    it('rejects occupancy without required residentId', async () => {
      const api = authRequest(testApp.server, testApp.token)
      await api
        .post(`/api/v1/properties/${propertyId}/units/${unitId}/occupancies`, {
          role: 'tenant',
          startDate: '2024-01-01',
        })
        .expect(400)
    })
  })

  describe('DELETE /api/v1/properties/:propertyId/units/:id', () => {
    it('deletes a unit', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const createRes = await api
        .post(`/api/v1/properties/${propertyId}/units`, {
          name: 'Unit to Delete',
        })
        .expect(201)

      await api
        .delete(`/api/v1/properties/${propertyId}/units/${createRes.body.id}`)
        .expect(204)
    })
  })
})
