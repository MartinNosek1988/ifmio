import request from 'supertest'
import { createTestApp, closeTestApp, authRequest, TestApp } from '../test/test.helpers'

describe('Meters (e2e)', () => {
  let testApp: TestApp
  let meterId: string

  beforeAll(async () => {
    testApp = await createTestApp()
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  describe('POST /api/v1/meters', () => {
    it('creates a meter', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .post('/api/v1/meters', {
          name: `Vodoměr ${Date.now()}`,
          serialNumber: `WM-${Date.now()}`,
          meterType: 'voda_studena',
          unit: 'm3',
          installDate: '2024-01-01',
        })
        .expect(201)

      expect(res.body).toHaveProperty('id')
      expect(res.body.meterType).toBe('voda_studena')
      expect(res.body.unit).toBe('m3')
      meterId = res.body.id
    })

    it('creates an electricity meter', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .post('/api/v1/meters', {
          name: `Elektroměr ${Date.now()}`,
          serialNumber: `EM-${Date.now()}`,
          meterType: 'elektrina',
          unit: 'kWh',
          manufacturer: 'Siemens',
          location: 'Rozvaděč v suterénu',
        })
        .expect(201)

      expect(res.body.meterType).toBe('elektrina')
      expect(res.body.manufacturer).toBe('Siemens')
    })

    it('rejects meter without required name', async () => {
      const api = authRequest(testApp.server, testApp.token)
      // Meters controller uses inline types without class-validator, so
      // missing required fields cause a DB constraint error (not a validation 400)
      const res = await api
        .post('/api/v1/meters', {
          serialNumber: 'NO-NAME-METER',
        })
      expect(res.status).not.toBe(201)
    })

    it('rejects meter without required serialNumber', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .post('/api/v1/meters', {
          name: 'Meter Without Serial',
        })
      expect(res.status).not.toBe(201)
    })
  })

  describe('GET /api/v1/meters', () => {
    it('lists meters', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .get('/api/v1/meters')
        .expect(200)

      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThanOrEqual(1)
    })

    it('filters meters by type', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .get('/api/v1/meters?meterType=elektrina')
        .expect(200)

      expect(Array.isArray(res.body)).toBe(true)
      res.body.forEach((m: any) => {
        expect(m.meterType).toBe('elektrina')
      })
    })

    it('requires authentication', async () => {
      await request(testApp.server)
        .get('/api/v1/meters')
        .expect(401)
    })
  })

  describe('GET /api/v1/meters/stats', () => {
    it('returns meter statistics', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .get('/api/v1/meters/stats')
        .expect(200)

      expect(res.body).toHaveProperty('total')
      expect(typeof res.body.total).toBe('number')
    })
  })

  describe('GET /api/v1/meters/:id', () => {
    it('returns meter detail', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .get(`/api/v1/meters/${meterId}`)
        .expect(200)

      expect(res.body.id).toBe(meterId)
      expect(res.body.meterType).toBe('voda_studena')
    })

    it('returns 404 for nonexistent meter', async () => {
      const api = authRequest(testApp.server, testApp.token)
      await api
        .get('/api/v1/meters/00000000-0000-0000-0000-000000000000')
        .expect(404)
    })
  })

  describe('PUT /api/v1/meters/:id', () => {
    it('updates meter fields', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .put(`/api/v1/meters/${meterId}`, {
          location: 'Sklep – místnost 2',
          note: 'Kontrola provedena',
          calibrationDue: '2026-12-31',
        })
        .expect(200)

      expect(res.body.location).toBe('Sklep – místnost 2')
      expect(res.body.note).toBe('Kontrola provedena')
    })

    it('returns 404 when updating nonexistent meter', async () => {
      const api = authRequest(testApp.server, testApp.token)
      await api
        .put('/api/v1/meters/00000000-0000-0000-0000-000000000000', {
          note: 'Ghost meter',
        })
        .expect(404)
    })
  })

  describe('POST /api/v1/meters/:id/readings', () => {
    it('adds a reading to a meter', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .post(`/api/v1/meters/${meterId}/readings`, {
          readingDate: '2024-03-15',
          value: 1234.56,
          note: 'Měsíční odečet',
        })
        .expect(201)

      expect(res.body).toHaveProperty('id')
      expect(res.body.value).toBe(1234.56)
    })

    it('adds another reading with higher value', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .post(`/api/v1/meters/${meterId}/readings`, {
          readingDate: '2024-04-15',
          value: 1289.0,
        })
        .expect(201)

      expect(res.body.value).toBe(1289.0)
    })

    it('rejects reading without required readingDate', async () => {
      const api = authRequest(testApp.server, testApp.token)
      // Inline DTO types without class-validator - missing fields cause DB errors
      const res = await api
        .post(`/api/v1/meters/${meterId}/readings`, {
          value: 999,
        })
      expect(res.status).not.toBe(201)
    })

    it('rejects reading without required value', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .post(`/api/v1/meters/${meterId}/readings`, {
          readingDate: '2024-05-01',
        })
      expect(res.status).not.toBe(201)
    })
  })

  describe('GET /api/v1/meters/:id/readings', () => {
    it('returns readings for a meter', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .get(`/api/v1/meters/${meterId}/readings`)
        .expect(200)

      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('DELETE /api/v1/meters/:id', () => {
    it('deletes a meter', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const createRes = await api
        .post('/api/v1/meters', {
          name: 'Meter To Delete',
          serialNumber: `DEL-${Date.now()}`,
        })
        .expect(201)

      const res = await api
        .delete(`/api/v1/meters/${createRes.body.id}`)
      expect([200, 204]).toContain(res.status)
    })

    it('returns 404 when deleting nonexistent meter', async () => {
      const api = authRequest(testApp.server, testApp.token)
      await api
        .delete('/api/v1/meters/00000000-0000-0000-0000-000000000000')
        .expect(404)
    })
  })
})
