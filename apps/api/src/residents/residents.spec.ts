import request from 'supertest'
import { createTestApp, closeTestApp, authRequest, TestApp } from '../test/test.helpers'

describe('Residents (e2e)', () => {
  let testApp: TestApp
  let residentId: string

  beforeAll(async () => {
    testApp = await createTestApp()
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  describe('POST /api/v1/residents', () => {
    it('creates a resident', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .post('/api/v1/residents', {
          firstName: 'Jan',
          lastName: 'Novák',
          role: 'tenant',
          email: `jan.novak.${Date.now()}@test.cz`,
          phone: '+420 777 123 456',
        })
        .expect(201)

      expect(res.body).toHaveProperty('id')
      expect(res.body.firstName).toBe('Jan')
      expect(res.body.lastName).toBe('Novák')
      expect(res.body.role).toBe('tenant')
      residentId = res.body.id
    })

    it('creates a legal entity resident', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .post('/api/v1/residents', {
          firstName: 'Petr',
          lastName: 'Ředitel',
          role: 'owner',
          isLegalEntity: true,
          companyName: 'Test s.r.o.',
          ico: '12345678',
        })
        .expect(201)

      expect(res.body.isLegalEntity).toBe(true)
      expect(res.body.companyName).toBe('Test s.r.o.')
    })

    it('rejects resident without required firstName', async () => {
      const api = authRequest(testApp.server, testApp.token)
      await api
        .post('/api/v1/residents', {
          lastName: 'Novák',
          role: 'tenant',
        })
        .expect(400)
    })

    it('rejects resident without required lastName', async () => {
      const api = authRequest(testApp.server, testApp.token)
      await api
        .post('/api/v1/residents', {
          firstName: 'Jan',
          role: 'tenant',
        })
        .expect(400)
    })

    it('rejects resident without required role', async () => {
      const api = authRequest(testApp.server, testApp.token)
      await api
        .post('/api/v1/residents', {
          firstName: 'Jan',
          lastName: 'Novák',
        })
        .expect(400)
    })
  })

  describe('GET /api/v1/residents', () => {
    it('lists residents with pagination', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .get('/api/v1/residents?page=1&limit=10')
        .expect(200)

      expect(res.body).toHaveProperty('data')
      expect(res.body).toHaveProperty('total')
      expect(Array.isArray(res.body.data)).toBe(true)
    })

    it('requires authentication', async () => {
      await request(testApp.server)
        .get('/api/v1/residents')
        .expect(401)
    })

    it('filters by role', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .get('/api/v1/residents?role=tenant')
        .expect(200)

      const tenantResidents = res.body.data.filter((r: any) => r.role !== 'tenant')
      expect(tenantResidents.length).toBe(0)
    })
  })

  describe('GET /api/v1/residents/:id', () => {
    it('returns resident detail', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .get(`/api/v1/residents/${residentId}`)
        .expect(200)

      expect(res.body.id).toBe(residentId)
      expect(res.body.firstName).toBe('Jan')
      expect(res.body.lastName).toBe('Novák')
    })

    it('returns 404 for nonexistent resident', async () => {
      const api = authRequest(testApp.server, testApp.token)
      await api
        .get('/api/v1/residents/00000000-0000-0000-0000-000000000000')
        .expect(404)
    })
  })

  describe('PUT /api/v1/residents/:id', () => {
    it('updates resident fields', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .put(`/api/v1/residents/${residentId}`, {
          firstName: 'Jan',
          lastName: 'Novák',
          role: 'tenant',
          phone: '+420 999 888 777',
          note: 'Aktualizovaná poznámka',
        })
        .expect(200)

      expect(res.body.phone).toBe('+420 999 888 777')
      expect(res.body.note).toBe('Aktualizovaná poznámka')
    })

    it('returns 404 when updating nonexistent resident', async () => {
      const api = authRequest(testApp.server, testApp.token)
      await api
        .put('/api/v1/residents/00000000-0000-0000-0000-000000000000', {
          firstName: 'Ghost',
          lastName: 'User',
          role: 'tenant',
        })
        .expect(404)
    })
  })

  describe('DELETE /api/v1/residents/:id', () => {
    it('deletes a resident', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const createRes = await api
        .post('/api/v1/residents', {
          firstName: 'ToDelete',
          lastName: 'Resident',
          role: 'contact',
        })
        .expect(201)

      await api
        .delete(`/api/v1/residents/${createRes.body.id}`)
        .expect(204)
    })

    it('returns 404 when deleting nonexistent resident', async () => {
      const api = authRequest(testApp.server, testApp.token)
      await api
        .delete('/api/v1/residents/00000000-0000-0000-0000-000000000000')
        .expect(404)
    })
  })
})
