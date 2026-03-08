import request from 'supertest'
import { createTestApp, closeTestApp, authRequest, TestApp } from '../test/test.helpers'

describe('Auth (e2e)', () => {
  let testApp: TestApp

  beforeAll(async () => {
    testApp = await createTestApp()
  })

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  describe('POST /api/v1/auth/register', () => {
    it('creates a new user and returns token', async () => {
      const email = `new${Date.now()}@test.cz`
      const res = await request(testApp.server)
        .post('/api/v1/auth/register')
        .send({
          tenantName: 'Nový Tenant',
          name: 'Jan Novák',
          email,
          password: 'heslo12345',
        })
        .expect(201)

      expect(res.body).toHaveProperty('accessToken')
      expect(res.body.user).toMatchObject({
        email,
        name: 'Jan Novák',
        role: 'owner',
      })
    })

    it('returns 409 for duplicate email', async () => {
      const email = `dup${Date.now()}@test.cz`
      await request(testApp.server)
        .post('/api/v1/auth/register')
        .send({ tenantName: 'T1', name: 'A', email, password: 'pass12345' })
        .expect(201)

      await request(testApp.server)
        .post('/api/v1/auth/register')
        .send({ tenantName: 'T2', name: 'B', email, password: 'pass12345' })
        .expect(409)
    })
  })

  describe('POST /api/v1/auth/login', () => {
    it('returns token for correct credentials', async () => {
      const email = `login${Date.now()}@test.cz`
      await request(testApp.server)
        .post('/api/v1/auth/register')
        .send({ tenantName: 'T', name: 'U', email, password: 'heslo12345' })

      const res = await request(testApp.server)
        .post('/api/v1/auth/login')
        .send({ email, password: 'heslo12345' })
        .expect(200)

      expect(res.body).toHaveProperty('accessToken')
    })

    it('returns 401 for wrong password', async () => {
      await request(testApp.server)
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@test.cz', password: 'wrong' })
        .expect(401)
    })
  })

  describe('GET /api/v1/auth/me', () => {
    it('returns current user profile', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/auth/me').expect(200)
      expect(res.body).toHaveProperty('id')
      expect(res.body).toHaveProperty('email')
      expect(res.body).toHaveProperty('tenantId')
    })

    it('returns 401 without token', async () => {
      await request(testApp.server)
        .get('/api/v1/auth/me')
        .expect(401)
    })
  })
})
