import request from 'supertest'
import { createTestApp, closeTestApp, TestApp } from '../test/test.helpers'

describe('Health (e2e)', () => {
  let testApp: TestApp

  beforeAll(async () => {
    testApp = await createTestApp()
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  describe('GET /api/v1/health', () => {
    it('returns ok status with db connectivity', async () => {
      const res = await request(testApp.server)
        .get('/api/v1/health')
        .expect(200)

      expect(res.body).toMatchObject({
        status: 'ok',
        database: 'connected',
      })
      expect(res.body).toHaveProperty('timestamp')
    })

    it('is publicly accessible without auth', async () => {
      // Health endpoint should work without Bearer token
      await request(testApp.server)
        .get('/api/v1/health')
        .expect(200)
    })
  })
})
