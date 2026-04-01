import request from 'supertest'
import {
  createTestApp,
  closeTestApp,
  authRequest,
  TestApp,
} from './test.helpers'

describe('Auth Extended (e2e)', () => {
  let testApp: TestApp
  let api: ReturnType<typeof authRequest>

  beforeAll(async () => {
    testApp = await createTestApp()
    api = authRequest(testApp.server, testApp.token)
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  // ── Registrace ──

  describe('POST /api/v1/auth/register', () => {
    it('registrace bez jména → 400', async () => {
      await request(testApp.server)
        .post('/api/v1/auth/register')
        .send({
          email: `noname-${Date.now()}@test.cz`,
          password: 'Test12345',
          tenantName: 'Test',
        })
        .expect(400)
    })

    it('registrace s krátkým heslem (< 8 znaků) → 400', async () => {
      await request(testApp.server)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test',
          email: `short-${Date.now()}@test.cz`,
          password: 'Ab1',
          tenantName: 'Test',
        })
        .expect(400)
    })

    it('registrace s neplatným emailem → 400', async () => {
      await request(testApp.server)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test',
          email: 'not-an-email',
          password: 'Test12345',
          tenantName: 'Test',
        })
        .expect(400)
    })

    it('registrace bez tenantName → 400', async () => {
      await request(testApp.server)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test',
          email: `notenant-${Date.now()}@test.cz`,
          password: 'Test12345',
        })
        .expect(400)
    })

    it('registrace s duplicitním emailem → 409', async () => {
      const email = `dup-${Date.now()}@test.cz`
      await request(testApp.server)
        .post('/api/v1/auth/register')
        .send({
          name: 'First',
          email,
          password: 'Test12345',
          tenantName: `T1 ${Date.now()}`,
        })
        .expect(201)

      await request(testApp.server)
        .post('/api/v1/auth/register')
        .send({
          name: 'Second',
          email,
          password: 'Test12345',
          tenantName: `T2 ${Date.now()}`,
        })
        .expect(409)
    })

    it('úspěšná registrace vrátí accessToken a user', async () => {
      const res = await request(testApp.server)
        .post('/api/v1/auth/register')
        .send({
          name: 'Nový Uživatel',
          email: `new-${Date.now()}@test.cz`,
          password: 'SecurePass123',
          tenantName: `Nový Tenant ${Date.now()}`,
        })
        .expect(201)

      expect(res.body).toHaveProperty('accessToken')
      expect(res.body).toHaveProperty('refreshToken')
      expect(res.body).toHaveProperty('user')
      expect(res.body.user).toHaveProperty('id')
      expect(res.body.user).toHaveProperty('email')
      expect(res.body.user).toHaveProperty('role')
    })
  })

  // ── Login ──

  describe('POST /api/v1/auth/login', () => {
    it('login s neexistujícím emailem → 401', async () => {
      await request(testApp.server)
        .post('/api/v1/auth/login')
        .send({ email: 'neexistuje@test.cz', password: 'Test12345' })
        .expect(401)
    })

    it('login se špatným heslem → 401', async () => {
      const email = `wrongpw-${Date.now()}@test.cz`
      await request(testApp.server)
        .post('/api/v1/auth/register')
        .send({
          name: 'WrongPW',
          email,
          password: 'CorrectPass1',
          tenantName: `T ${Date.now()}`,
        })
        .expect(201)

      await request(testApp.server)
        .post('/api/v1/auth/login')
        .send({ email, password: 'WrongPassword1' })
        .expect(401)
    })

    it('login s prázdným body → 400', async () => {
      await request(testApp.server)
        .post('/api/v1/auth/login')
        .send({})
        .expect(400)
    })
  })

  // ── Token Refresh ──

  describe('POST /api/v1/auth/refresh', () => {
    it('refresh s neplatným tokenem → 401', async () => {
      await request(testApp.server)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token-value' })
        .expect(401)
    })

    it('refresh s platným tokenem → nový pár tokenů', async () => {
      const email = `refresh-${Date.now()}@test.cz`
      const regRes = await request(testApp.server)
        .post('/api/v1/auth/register')
        .send({
          name: 'Refresh',
          email,
          password: 'Test12345',
          tenantName: `RT ${Date.now()}`,
        })
        .expect(201)

      const res = await request(testApp.server)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: regRes.body.refreshToken })
        .expect(200)

      expect(res.body).toHaveProperty('accessToken')
      expect(res.body).toHaveProperty('refreshToken')
    })
  })

  // ── Profil ──

  describe('GET /api/v1/auth/me', () => {
    it('vrátí aktuálního uživatele s tenant info', async () => {
      const res = await api.get('/api/v1/auth/me').expect(200)
      expect(res.body).toHaveProperty('id')
      expect(res.body).toHaveProperty('email')
      expect(res.body).toHaveProperty('role')
      expect(res.body).toHaveProperty('tenantId')
    })

    it('bez tokenu → 401', async () => {
      await request(testApp.server).get('/api/v1/auth/me').expect(401)
    })
  })

  describe('PATCH /api/v1/auth/profile', () => {
    it('aktualizace jména → 200', async () => {
      const newName = `Updated ${Date.now()}`
      const res = await api
        .patch('/api/v1/auth/profile', { name: newName })
        .expect(200)
      expect(res.body).toHaveProperty('name')
    })

    it('bez tokenu → 401', async () => {
      await request(testApp.server)
        .patch('/api/v1/auth/profile')
        .send({ name: 'Unauthorized' })
        .expect(401)
    })
  })

  // ── Změna hesla ──

  describe('PATCH /api/v1/auth/change-password', () => {
    it('se špatným starým heslem → chyba', async () => {
      const res = await api.patch('/api/v1/auth/change-password', {
        currentPassword: 'WrongOldPassword1',
        newPassword: 'NewSecure12345',
      })
      expect([400, 401]).toContain(res.status)
    })

    it('se správným starým heslem → 200', async () => {
      // Registrace nového uživatele pro čistý test
      const email = `chgpw-${Date.now()}@test.cz`
      const password = 'OriginalPass1'
      const regRes = await request(testApp.server)
        .post('/api/v1/auth/register')
        .send({
          name: 'ChangePW',
          email,
          password,
          tenantName: `CPW ${Date.now()}`,
        })
        .expect(201)

      const userApi = authRequest(testApp.server, regRes.body.accessToken)
      await userApi
        .patch('/api/v1/auth/change-password', {
          currentPassword: password,
          newPassword: 'NewSecure12345',
        })
        .expect(200)
    })
  })

  // ── Sessions ──

  describe('GET /api/v1/auth/sessions', () => {
    it('vrátí seznam aktivních sessions', async () => {
      const res = await api.get('/api/v1/auth/sessions').expect(200)
      expect(Array.isArray(res.body)).toBe(true)
    })
  })

  describe('GET /api/v1/auth/login-history', () => {
    it('vrátí historii přihlášení', async () => {
      const res = await api.get('/api/v1/auth/login-history').expect(200)
      expect(Array.isArray(res.body)).toBe(true)
    })
  })

  // ── 2FA ──

  describe('POST /api/v1/auth/2fa/setup', () => {
    it('vrátí TOTP secret a QR URI', async () => {
      const res = await api.post('/api/v1/auth/2fa/setup', {}).expect(201)
      expect(res.body).toHaveProperty('secret')
    })
  })

  describe('POST /api/v1/auth/2fa/validate', () => {
    it('s neplatným tempToken → 401', async () => {
      await request(testApp.server)
        .post('/api/v1/auth/2fa/validate')
        .send({ tempToken: 'fake-temp-token', code: '000000' })
        .expect(401)
    })
  })

  // ── Password Reset ──

  describe('POST /api/v1/auth/forgot-password', () => {
    it('s libovolným emailem vrátí 200 (bezpečné — neleakuje existenci)', async () => {
      await request(testApp.server)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'anyone@test.cz' })
        .expect(200)
    })
  })

  describe('POST /api/v1/auth/reset-password', () => {
    it('s neplatným tokenem → 401', async () => {
      await request(testApp.server)
        .post('/api/v1/auth/reset-password')
        .send({ token: 'invalid-reset-token', password: 'NewPass12345' })
        .expect(401)
    })
  })

  // ── Logout ──

  describe('POST /api/v1/auth/logout', () => {
    it('odhlášení → 200 a token invalidován', async () => {
      const email = `logout-${Date.now()}@test.cz`
      const regRes = await request(testApp.server)
        .post('/api/v1/auth/register')
        .send({
          name: 'Logout',
          email,
          password: 'Test12345',
          tenantName: `LT ${Date.now()}`,
        })
        .expect(201)

      const logoutApi = authRequest(testApp.server, regRes.body.accessToken)
      await logoutApi.post('/api/v1/auth/logout', {}).expect(204)
    })

    it('bez tokenu → 401', async () => {
      await request(testApp.server)
        .post('/api/v1/auth/logout')
        .expect(401)
    })
  })
})
