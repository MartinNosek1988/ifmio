import request from 'supertest'
import { createTestApp, closeTestApp, authRequest, TestApp } from '../test/test.helpers'

describe('Properties (e2e)', () => {
  let testApp: TestApp
  let createdId: string

  beforeAll(async () => {
    testApp = await createTestApp()
  })

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  describe('POST /api/v1/properties', () => {
    it('creates a property', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .post('/api/v1/properties', {
          name: 'Testovací dům',
          address: 'Testovací ulice 1',
          city: 'Praha',
          postalCode: '11000',
          type: 'SVJ',
          ownership: 'vlastnictvi',
        })
        .expect(201)

      expect(res.body).toMatchObject({ name: 'Testovací dům' })
      expect(res.body).toHaveProperty('id')
      createdId = res.body.id
    })
  })

  describe('GET /api/v1/properties', () => {
    it('returns list of properties', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/properties').expect(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThan(0)
    })

    it('returns 401 without token', async () => {
      await request(testApp.server)
        .get('/api/v1/properties')
        .expect(401)
    })
  })

  describe('GET /api/v1/properties/:id', () => {
    it('returns property detail', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .get(`/api/v1/properties/${createdId}`)
        .expect(200)
      expect(res.body.id).toBe(createdId)
    })
  })

  describe('PATCH /api/v1/properties/:id', () => {
    it('updates a property', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .patch(`/api/v1/properties/${createdId}`, {
          name: 'Aktualizovaný dům',
        })
        .expect(200)
      expect(res.body.name).toBe('Aktualizovaný dům')
    })
  })

  describe('DELETE /api/v1/properties/:id', () => {
    it('archives the property (204)', async () => {
      const api = authRequest(testApp.server, testApp.token)
      await api.delete(`/api/v1/properties/${createdId}`).expect(204)
    })
  })
})
